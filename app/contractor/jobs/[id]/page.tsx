import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/supabase';
import { getContractor, ownJob, jobIsOpen, matchingMembers, meetsJob, type Candidate } from '@/lib/contractors';
import { tradeLabel, accreditationLabel, gbp } from '@/lib/config';
import { valueBandLabel } from '@/lib/contractorPlans';
import { tradeWarnings, type StatusRow } from '@/lib/tradeStatus';
import ContractorNav from '../../ContractorNav';
import JobFiles from './JobFiles';
import '../../../contractor.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Job | TLGB' };

const ukDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

function Act({ action, back, fields, label, cls }: { action: string; back: string; fields: Record<string, string>; label: string; cls?: string }) {
  return (
    <form method="post" action="/api/contractor/action">
      <input type="hidden" name="action" value={action} />
      <input type="hidden" name="back" value={back} />
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button type="submit" className={cls}>{label}</button>
    </form>
  );
}

const CANDIDATE_COLS = 'id, trading_name, email, contact_name, trades, lat, lng, radius_miles, pl_cover_amount, pl_expiry, el_expiry, el_cover_amount, accreditations, accreditation_expiries, job_alerts, status, founding_member, subscription_status, phone';

export default async function ContractorJob({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const me = await getContractor();
  const { id } = await params;
  if (!me) redirect(`/login?next=/contractor/jobs/${id}`);
  const job = await ownJob(me, id);
  if (!job) notFound();
  const sp = await searchParams;
  const back = `/contractor/jobs/${job.id}`;
  const open = jobIsOpen(job);

  const [{ data: files }, { data: invites }, { data: replies }, { data: favs }] = await Promise.all([
    db().from('contractor_job_files').select('id, file_name, size_bytes').eq('job_id', job.id).order('created_at'),
    db().from('contractor_job_invites').select('business_id, invited_at').eq('job_id', job.id),
    db().from('contractor_job_replies').select('id, business_id, created_at, message, pack_link_id, status, contractor_note').eq('job_id', job.id).order('created_at', { ascending: false }),
    db().from('contractor_favourites').select('business_id').eq('company_id', me.company.id),
  ]);
  const favIds = (favs ?? []).map((f) => f.business_id as string);
  const replyIds = (replies ?? []).map((r) => r.business_id as string);
  const inviteIds = (invites ?? []).map((i) => i.business_id as string);
  const allIds = [...new Set([...favIds, ...replyIds, ...inviteIds])];
  const packIds = (replies ?? []).map((r) => r.pack_link_id).filter(Boolean) as string[];

  const [{ data: biz }, { data: packs }] = await Promise.all([
    allIds.length ? db().from('businesses').select(CANDIDATE_COLS).in('id', allIds) : Promise.resolve({ data: [] as never[] }),
    packIds.length ? db().from('pack_links').select('id, token, revoked_at, expires_at').in('id', packIds) : Promise.resolve({ data: [] as never[] }),
  ]);
  const byId = new Map((biz ?? []).map((b) => [b.id as string, b]));
  const matchCount = job.status === 'draft' ? (await matchingMembers(job)).filter((b) => b.job_alerts).length : job.notified_count;

  const canInvite = favIds.filter((fid) => !inviteIds.includes(fid) && !replyIds.includes(fid) && byId.get(fid)?.status === 'approved');
  const statusTag = job.status === 'draft' ? <span className="ct-tag draft">Draft, not sent yet</span>
    : open ? <span className="ct-tag ok">Open</span>
    : <span className="ct-tag">{job.status === 'closed' ? 'Closed' : 'Past reply date'}</span>;

  return (
    <div className="ct-page">
      <ContractorNav me={me} on="jobs" />
      {sp.error && <p className="err big">{sp.error}</p>}
      {sp.saved && <p className="ct-banner ok">Saved.</p>}

      <div className="ct-head">
        <div>
          <h2 style={{ margin: 0 }}>{job.title}</h2>
          <div className="ct-meta">{statusTag}{job.published_at && <span>Sent {ukDate(job.published_at)} to {job.notified_count} matching member{job.notified_count === 1 ? '' : 's'}</span>}</div>
        </div>
        <div className="ct-actions">
          <Link href={`${back}/edit`} className="ct-btn">Edit</Link>
          {job.status !== 'draft' && <Link href={`/jobs/${job.id}`} className="ct-btn">See it as trades do</Link>}
          {job.status === 'open' && <Act action="job-close" back={back} fields={{ job_id: job.id }} label="Close job" />}
          {job.status === 'closed' && <Act action="job-reopen" back={back} fields={{ job_id: job.id }} label="Reopen" />}
          {job.status === 'draft' && <Act action="job-delete" back="/contractor/jobs" fields={{ job_id: job.id }} label="Delete draft" />}
        </div>
      </div>

      {job.status === 'draft' && (
        <div className="ct-box" style={{ borderLeft: '4px solid var(--rust)' }}>
          <h2>Ready to send?</h2>
          <p><strong>{matchCount}</strong> member{matchCount === 1 ? '' : 's'} match this job right now: {job.trades.map(tradeLabel).join(' or ')}, covering {job.postcode}
            {job.min_pl ? `, with at least ${gbp(job.min_pl)} public liability` : ''}{job.accreditations.length ? `, holding ${job.accreditations.map(accreditationLabel).join(', ')}` : ''}.
            {matchCount === 0 && ' Try fewer required accreditations, or invite trades from your shortlist once it is sent.'}</p>
          {me.company.status === 'approved'
            ? <Act action="job-publish" back={back} fields={{ job_id: job.id }} label={`Send to ${matchCount} matching trade${matchCount === 1 ? '' : 's'}`} cls="go" />
            : <p className="ct-banner">You can send this once your company is approved.</p>}
        </div>
      )}

      <section className="ct-box">
        <h2>The job</h2>
        <div className="ct-meta">
          <span><b>Trades:</b> {job.trades.map(tradeLabel).join(', ')}</span>
          <span><b>Site:</b> {job.town ? `${job.town}, ` : ''}{job.postcode}</span>
          {valueBandLabel(job.value_band) && <span><b>Value:</b> {valueBandLabel(job.value_band)}</span>}
          {job.start_date && <span><b>Start:</b> {ukDate(job.start_date)}</span>}
          {job.return_date && <span><b>Reply by:</b> {ukDate(job.return_date)}</span>}
          {job.min_pl && <span><b>Min. public liability:</b> {gbp(job.min_pl)}</span>}
        </div>
        {job.accreditations.length > 0 && <p className="ct-meta"><b>Required:</b> {job.accreditations.map(accreditationLabel).join(', ')}</p>}
        <p className="ct-desc">{job.description}</p>
        {job.docs_url && <p><a href={job.docs_url} target="_blank" rel="noopener nofollow">Documents link</a></p>}
        <p className="muted small">Contact shown to trades: {job.contact_name} ({job.contact_email})</p>
        <h3 style={{ marginTop: 14 }}>Drawings and documents</h3>
        <JobFiles jobId={job.id} files={files ?? []} />
      </section>

      <section className="ct-box">
        <h2>Replies ({replies?.length ?? 0})</h2>
        {!replies?.length && <p className="ct-empty">{job.status === 'draft' ? 'Replies appear here once you send the job.' : 'No replies yet. We email you as soon as one arrives.'}</p>}
        {(replies ?? []).map((r) => {
          const b = byId.get(r.business_id);
          if (!b) return null;
          const pack = (packs ?? []).find((p) => p.id === r.pack_link_id);
          const packLive = pack && !pack.revoked_at && (!pack.expires_at || new Date(pack.expires_at) > new Date());
          return (
            <div key={r.id} className="ct-row">
              <div className="grow">
                <h3><Link href={`/b/${b.id}`}>{b.trading_name}</Link> {r.status !== 'new' && <span className={`ct-tag ${r.status === 'shortlisted' ? 'ok' : 'bad'}`}>{r.status === 'shortlisted' ? 'Shortlisted' : 'Declined'}</span>}{r.status === 'new' && <span className="ct-tag warn">New</span>}</h3>
                <div className="ct-meta">
                  <span>Replied {ukDate(r.created_at)}</span><a href={`tel:${b.phone}`}>{b.phone}</a><a href={`mailto:${b.email}`}>{b.email}</a>
                  {inviteIds.includes(b.id) && <span>You invited them</span>}
                </div>
                <div>{tradeWarnings(b as StatusRow).map((w) => <span key={w.text} className={`ct-tag ${w.tone}`}>{w.text}</span>)}
                  {!meetsJob(b as Candidate, job) && <span className="ct-tag warn">Does not meet all your requirements</span>}</div>
                {r.message && <p className="ct-desc" style={{ marginTop: 6 }}>{r.message}</p>}
                {packLive && <p><a href={`/pack/${pack!.token}`} target="_blank" className="ct-btn go">Open their compliance pack and company profile</a></p>}
                <form method="post" action="/api/contractor/action" style={{ marginTop: 6 }}>
                  <input type="hidden" name="action" value="reply-note" /><input type="hidden" name="back" value={back} /><input type="hidden" name="reply_id" value={r.id} />
                  <textarea name="note" className="ct-note" maxLength={2000} defaultValue={r.contractor_note ?? ''} placeholder="Private note, e.g. price received, follow up Tuesday" />
                  <button type="submit" className="ct-btn">save note</button>
                </form>
              </div>
              <div className="ct-actions" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                {r.status !== 'shortlisted' && <Act action="reply-status" back={back} fields={{ reply_id: r.id, status: 'shortlisted' }} label="Shortlist" />}
                {r.status !== 'declined' && <Act action="reply-status" back={back} fields={{ reply_id: r.id, status: 'declined' }} label="Decline" />}
                {r.status !== 'new' && <Act action="reply-status" back={back} fields={{ reply_id: r.id, status: 'new' }} label="Reset" />}
                {!favIds.includes(b.id) && <Act action="fav-add" back={back} fields={{ business_id: b.id }} label="Save to shortlist" />}
              </div>
            </div>
          );
        })}
      </section>

      <section className="ct-box">
        <h2>Invite from your shortlist</h2>
        {!open && <p className="ct-empty">{job.status === 'draft' ? 'Send the job first, then invite trades from your shortlist.' : 'This job is not open.'}</p>}
        {open && !favIds.length && <p className="ct-empty">Your shortlist is empty. <Link href="/search">Find trades</Link> and save them.</p>}
        {open && favIds.length > 0 && !canInvite.length && <p className="ct-empty">Everyone on your shortlist has been invited or has replied.</p>}
        {open && canInvite.length > 0 && (
          <form method="post" action="/api/contractor/action">
            <input type="hidden" name="action" value="job-invite" /><input type="hidden" name="back" value={back} /><input type="hidden" name="job_id" value={job.id} />
            <div className="ct-check-list">
              {canInvite.map((fid) => {
                const b = byId.get(fid)!;
                return (
                  <label key={fid}>
                    <input type="checkbox" name="business_ids" value={fid} />
                    <span>{b.trading_name} <span className="muted small">{(b.trades as string[]).map(tradeLabel).join(', ')}</span>{' '}
                      {meetsJob(b as Candidate, job) ? <span className="ct-tag ok">meets requirements</span> : <span className="ct-tag warn">does not meet all requirements</span>}</span>
                  </label>
                );
              })}
            </div>
            <button type="submit" className="ct-btn go">Invite ticked trades to price</button>
            <p className="muted small">Each one gets an email with the job and can reply here, even if they are not a paying member.</p>
          </form>
        )}
        {inviteIds.length > 0 && (
          <p className="muted small" style={{ marginTop: 10 }}>Invited: {inviteIds.map((i) => byId.get(i)?.trading_name).filter(Boolean).join(', ')}</p>
        )}
      </section>
    </div>
  );
}
