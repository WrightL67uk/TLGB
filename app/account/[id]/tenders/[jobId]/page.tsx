import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/supabase';
import { ownJob, jobIsOpen, sectorLabel } from '@/lib/contractors';
import { tradeLabel, accreditationLabel, gbp } from '@/lib/config';
import { valueBandLabel } from '@/lib/contractorPlans';
import { loadMember, TenderHead } from '../shared';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tender | TLGB' };

const ukDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

function Act({ action, id, jobId, fields, label, cls }: { action: string; id: string; jobId: string; fields?: Record<string, string>; label: string; cls?: string }) {
  return (
    <form method="post" action="/api/member-tenders">
      <input type="hidden" name="action" value={action} /><input type="hidden" name="business_id" value={id} /><input type="hidden" name="job_id" value={jobId} />
      {fields && Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button type="submit" className={cls}>{label}</button>
    </form>
  );
}

export default async function MemberTender({ params, searchParams }: { params: Promise<{ id: string; jobId: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { id, jobId } = await params;
  const sp = await searchParams;
  const { me, name } = await loadMember(id, `/account/${id}/tenders/${jobId}`);
  const job = await ownJob(me, jobId);
  if (!job) notFound();
  const open = jobIsOpen(job);

  const { data: replies } = await db().from('contractor_job_replies').select('id, business_id, created_at, message, pack_link_id, status, contractor_note').eq('job_id', job.id).order('created_at', { ascending: false });
  const bids = [...new Set((replies ?? []).map((r) => r.business_id as string))];
  const packIds = (replies ?? []).map((r) => r.pack_link_id).filter(Boolean) as string[];
  const [{ data: biz }, { data: packs }] = await Promise.all([
    bids.length ? db().from('businesses').select('id, trading_name, phone, email').in('id', bids) : Promise.resolve({ data: [] as never[] }),
    packIds.length ? db().from('pack_links').select('id, token, revoked_at, expires_at').in('id', packIds) : Promise.resolve({ data: [] as never[] }),
  ]);
  const byId = new Map((biz ?? []).map((b) => [b.id as string, b]));
  const status = job.status === 'draft' ? 'Draft, not sent' : job.status === 'pending' ? 'Waiting for our approval' : open ? 'Open' : job.status === 'closed' ? 'Closed' : 'Past reply date';

  return (
    <div className="ct-page">
      <TenderHead id={id} name={name} />
      {sp.error && <p className="err big">{sp.error}</p>}
      {sp.saved && <p className="ct-banner ok">Saved.</p>}
      <div className="ct-head">
        <div>
          <h2 style={{ margin: 0 }}>{job.title}</h2>
          <div className="ct-meta"><span className="ct-tag">{status}</span><span>{sectorLabel(job.sector)}</span>{job.published_at && <span>Sent to {job.notified_count} matching member{job.notified_count === 1 ? '' : 's'} on {ukDate(job.published_at)}</span>}</div>
        </div>
        <div className="ct-actions">
          {job.status === 'draft' && <Link href={`/account/${id}/tenders/${job.id}/edit`} className="ct-btn">Edit</Link>}
          {(job.status === 'open' || job.status === 'closed') && <Link href={`/jobs/${job.id}`} className="ct-btn">See it as members do</Link>}
          {job.status === 'open' && <Act action="close" id={id} jobId={job.id} label="Close tender" />}
          {job.status === 'closed' && <Act action="reopen" id={id} jobId={job.id} label="Reopen" />}
          {(job.status === 'draft' || job.status === 'pending') && <Act action="delete" id={id} jobId={job.id} label="Delete" />}
        </div>
      </div>

      {job.status === 'draft' && (
        <div className="ct-box" style={{ borderLeft: '4px solid var(--rust)' }}>
          <h2>Ready to send?</h2>
          {job.rejection_reason && <p className="err">Last time we could not approve it: {job.rejection_reason}</p>}
          <p>We check every tender first, then email it to the members who match.</p>
          <Act action="submit" id={id} jobId={job.id} label="Send for approval" cls="go" />
        </div>
      )}
      {job.status === 'pending' && <p className="ct-banner">We are checking this tender, usually within one working day. We will email you when it is live.</p>}

      <section className="ct-box">
        <h2>The tender</h2>
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
        <p className="muted small">Contact shown to members: {job.contact_name} ({job.contact_email})</p>
      </section>

      {job.status !== 'draft' && job.status !== 'pending' && (
        <section className="ct-box">
          <h2>Replies ({replies?.length ?? 0})</h2>
          {!replies?.length && <p className="ct-empty">No replies yet. We email you as soon as one arrives.</p>}
          {(replies ?? []).map((r) => {
            const b = byId.get(r.business_id);
            if (!b) return null;
            const pack = (packs ?? []).find((p) => p.id === r.pack_link_id);
            const packLive = pack && !pack.revoked_at && (!pack.expires_at || new Date(pack.expires_at) > new Date());
            const back = `/account/${id}/tenders/${job.id}`;
            void back;
            return (
              <div key={r.id} className="ct-row">
                <div className="grow">
                  <h3><Link href={`/b/${b.id}`}>{b.trading_name}</Link> {r.status === 'new' ? <span className="ct-tag warn">New</span> : <span className={`ct-tag ${r.status === 'shortlisted' ? 'ok' : 'bad'}`}>{r.status === 'shortlisted' ? 'Shortlisted' : 'Declined'}</span>}</h3>
                  <div className="ct-meta"><span>Replied {ukDate(r.created_at)}</span><a href={`tel:${b.phone}`}>{b.phone}</a><a href={`mailto:${b.email}`}>{b.email}</a></div>
                  {r.message && <p className="ct-desc" style={{ marginTop: 6 }}>{r.message}</p>}
                  {packLive && <p><a href={`/pack/${pack!.token}`} target="_blank" className="ct-btn go">Open their compliance pack</a></p>}
                  <form method="post" action="/api/member-tenders" style={{ marginTop: 6 }}>
                    <input type="hidden" name="action" value="reply-note" /><input type="hidden" name="business_id" value={id} /><input type="hidden" name="job_id" value={job.id} /><input type="hidden" name="reply_id" value={r.id} />
                    <textarea name="note" className="ct-note" maxLength={2000} defaultValue={r.contractor_note ?? ''} placeholder="Private note, e.g. price received" />
                    <button type="submit" className="ct-btn">save note</button>
                  </form>
                </div>
                <div className="ct-actions" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  {r.status !== 'shortlisted' && <Act action="reply-status" id={id} jobId={job.id} fields={{ reply_id: r.id, status: 'shortlisted' }} label="Shortlist" />}
                  {r.status !== 'declined' && <Act action="reply-status" id={id} jobId={job.id} fields={{ reply_id: r.id, status: 'declined' }} label="Decline" />}
                  {r.status !== 'new' && <Act action="reply-status" id={id} jobId={job.id} fields={{ reply_id: r.id, status: 'new' }} label="Reset" />}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
