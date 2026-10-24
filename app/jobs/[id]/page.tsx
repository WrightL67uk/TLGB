import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/supabase';
import { getSessionEmail } from '@/lib/session';
import { isPaid } from '@/lib/membership';
import { contractorByEmail, isUuid, memberAccess, meetsJob, jobIsOpen, type Candidate, type Job } from '@/lib/contractors';
import { tradeLabel, accreditationLabel, gbp } from '@/lib/config';
import { valueBandLabel } from '@/lib/contractorPlans';
import '../../contractor.css';
import '../../resources.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Job from a main contractor | The Little Green Book' };

const ukDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const CANDIDATE_COLS = 'id, trading_name, email, contact_name, trades, lat, lng, radius_miles, pl_cover_amount, pl_expiry, accreditations, accreditation_expiries, job_alerts, status, founding_member, subscription_status';

export default async function JobPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; sent?: string; reported?: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const sp = await searchParams;
  const { data } = await db().from('contractor_jobs').select('*').eq('id', id).maybeSingle();
  const job = data as Job | null;
  if (!job || job.status === 'draft' || job.status === 'removed') notFound();
  const { data: company } = await db().from('contractor_companies').select('id, name, website, status').eq('id', job.company_id).maybeSingle();
  if (!company || company.status !== 'approved') notFound();

  const email = await getSessionEmail();
  const contractor = email ? await contractorByEmail(email) : null;
  const ownCompany = contractor?.company.id === job.company_id;
  const { paidListing, invitedListing } = await memberAccess(email, job.id);
  const canSee = ownCompany || !!paidListing || !!invitedListing;
  const replyAs = paidListing ?? invitedListing;
  const open = jobIsOpen(job);

  let replied = false;
  let meets = true;
  let packable = false;
  if (replyAs) {
    const { count } = await db().from('contractor_job_replies').select('id', { count: 'exact', head: true }).eq('job_id', job.id).eq('business_id', replyAs.id);
    replied = !!count;
    const { data: b } = await db().from('businesses').select(CANDIDATE_COLS).eq('id', replyAs.id).maybeSingle();
    if (b) { meets = meetsJob(b as Candidate, job); packable = isPaid(b as Candidate); }
  }
  const { data: files } = canSee ? await db().from('contractor_job_files').select('id, file_name, size_bytes').eq('job_id', job.id).order('created_at') : { data: [] as never[] };

  return (
    <div className="ct-page" style={{ maxWidth: 820 }}>
      <p className="small"><Link href="/jobs">&larr; All jobs from main contractors</Link></p>
      {sp.error && <p className="err big">{sp.error}</p>}
      {sp.sent && <p className="ct-banner ok">Sent. {canSee ? 'The contractor has your reply and will be in touch if they want a price.' : ''}</p>}
      {sp.reported && <p className="ct-banner ok">Thanks, we will look at this job.</p>}

      <h1>{canSee ? job.title : `${job.trades.map(tradeLabel).join(', ')} package`}</h1>
      <div className="ct-meta">
        <span><b>{canSee ? company.name : 'Main contractor (shown to members)'}</b></span>
        {!open && <span className="ct-tag">Closed</span>}
        {invitedListing && !ownCompany && <span className="ct-tag ok">You were invited to price</span>}
      </div>

      <section className="ct-box" style={{ marginTop: 14 }}>
        <div className="ct-meta">
          <span><b>Trades:</b> {job.trades.map(tradeLabel).join(', ')}</span>
          <span><b>Area:</b> {job.town ? `${job.town}, ` : ''}{canSee ? job.postcode : job.postcode.split(' ')[0]}{job.region ? ` (${job.region})` : ''}</span>
          {valueBandLabel(job.value_band) && <span><b>Value:</b> {valueBandLabel(job.value_band)}</span>}
          {job.start_date && <span><b>Start:</b> {ukDate(job.start_date)}</span>}
          {job.return_date && <span><b>Reply by:</b> {ukDate(job.return_date)}</span>}
          {job.min_pl && <span><b>Min. public liability:</b> {gbp(job.min_pl)}</span>}
        </div>
        {job.accreditations.length > 0 && <p className="ct-meta"><b>Required:</b> {job.accreditations.map(accreditationLabel).join(', ')}</p>}
        {canSee ? (
          <>
            <p className="ct-desc">{job.description}</p>
            {job.docs_url && <p><a href={job.docs_url} target="_blank" rel="noopener nofollow" className="ct-btn">Open the documents link</a></p>}
            {!!files?.length && (
              <>
                <h3>Drawings and documents</h3>
                <ul className="ct-files">{files.map((f) => <li key={f.id}><a href={`/api/jobs/file/${f.id}`}>{f.file_name}</a></li>)}</ul>
              </>
            )}
            <p className="muted small">Contact: {job.contact_name}, <a href={`mailto:${job.contact_email}`}>{job.contact_email}</a>{company.website ? <> &middot; <a href={company.website} target="_blank" rel="noopener nofollow">{company.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a></> : null}</p>
          </>
        ) : (
          <div className="job-lock">
            <strong>The full job is for members.</strong> Members see the contractor, the scope, drawings and contact details, get jobs like this emailed the day they are posted, and reply with their paperwork attached.{' '}
            {email ? <Link href="/account">Start or renew your membership</Link> : <><Link href={`/login?next=/jobs/${job.id}`}>Log in</Link> or <Link href="/join">list your business</Link></>}.
          </div>
        )}
      </section>

      {ownCompany && <p><Link href={`/contractor/jobs/${job.id}`} className="ct-btn go">Manage this job and see replies</Link></p>}

      {replyAs && !ownCompany && (
        <section className="ct-box">
          <h2>Interested?</h2>
          {replied ? <p>You have replied to this job as <strong>{replyAs.trading_name}</strong>. The contractor will contact you directly.</p>
            : !open ? <p className="muted">This job is closed.</p>
            : (
              <form method="post" action="/api/jobs/reply" className="res-form" style={{ margin: 0, border: 0, padding: 0 }}>
                <input type="hidden" name="job_id" value={job.id} />
                <input type="hidden" name="business_id" value={replyAs.id} />
                {!meets && <p className="ct-banner">Your listing does not meet everything this job asks for (trade, area, insurance or accreditations). You can still reply, but say how you would cover it.</p>}
                <label>Message to {company.name}
                  <textarea name="message" maxLength={2000} placeholder="e.g. We would like to price this. Similar recent jobs, availability, any questions" />
                </label>
                {packable ? (
                  <label className="check" style={{ display: 'flex', fontWeight: 400 }}>
                    <input type="checkbox" name="share_pack" defaultChecked />
                    <span>Attach my compliance pack and company profile (insurance, accreditations, RAMS, policies and PQQ answers; not financial figures). This creates a share link you can switch off any time.</span>
                  </label>
                ) : <p className="muted small">Members can attach their compliance pack to replies.</p>}
                <button type="submit" className="primary">reply as {replyAs.trading_name}</button>
                <p className="muted small" style={{ margin: 0 }}>The contractor sees your business name, contact details and listing.</p>
              </form>
            )}
        </section>
      )}

      {email && !ownCompany && (
        <form method="post" action="/api/jobs/report" className="ct-inline" style={{ marginTop: 20 }}>
          <input type="hidden" name="job_id" value={job.id} />
          <input name="reason" maxLength={500} placeholder="Something wrong with this job? Tell us" style={{ flex: 1 }} />
          <button type="submit" className="ct-btn">report</button>
        </form>
      )}
    </div>
  );
}
