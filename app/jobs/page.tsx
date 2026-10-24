import Link from 'next/link';
import { db } from '@/lib/supabase';
import { getSessionEmail } from '@/lib/session';
import { isPaid } from '@/lib/membership';
import { meetsJob, openJobs, type Candidate, type Job } from '@/lib/contractors';
import { tradeLabel, TRADES } from '@/lib/config';
import { valueBandLabel } from '@/lib/contractorPlans';
import '../contractor.css';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Jobs from main contractors | The Little Green Book',
  description: 'Landscaping, groundworks, fencing and external works packages posted directly by main contractors and housebuilders. Members see the full details and reply.',
};

const ukDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const CANDIDATE_COLS = 'id, trading_name, email, contact_name, trades, lat, lng, radius_miles, pl_cover_amount, pl_expiry, accreditations, accreditation_expiries, job_alerts, status, founding_member, subscription_status';

export default async function JobsBoard({ searchParams }: { searchParams: Promise<{ trade?: string; view?: string }> }) {
  const sp = await searchParams;
  const email = await getSessionEmail();
  const { data: rows } = email ? await db().from('businesses').select(CANDIDATE_COLS).eq('email', email).neq('status', 'draft') : { data: null };
  const mine = ((rows ?? []) as Candidate[]).filter((b) => b.status === 'approved' && isPaid(b));
  const member = mine.length > 0;

  let jobs = await openJobs();
  const trade = TRADES.some((t) => t.slug === sp.trade) ? sp.trade! : '';
  const view = sp.view === 'all' || !member ? 'all' : 'mine';
  if (trade) jobs = jobs.filter((j) => j.trades.includes(trade));
  const matches = (j: Job) => mine.some((b) => meetsJob(b, j));
  if (view === 'mine') jobs = jobs.filter(matches);

  return (
    <div className="ct-page">
      <h1>Jobs from main contractors</h1>
      <p className="lead">Packages posted directly by main contractors, housebuilders and developers. {member ? 'Jobs that match your trade, area and paperwork are emailed to you the day they are posted.' : 'Members see the contractor, full details and drawings, and reply with their compliance pack attached.'}</p>

      <form method="get" className="ct-inline" style={{ marginBottom: 16 }}>
        {member && (
          <select name="view" defaultValue={view}>
            <option value="mine">Matched to me</option>
            <option value="all">All jobs</option>
          </select>
        )}
        <select name="trade" defaultValue={trade}>
          <option value="">All trades</option>
          {TRADES.map((t) => <option key={t.slug} value={t.slug}>{t.label}</option>)}
        </select>
        <button type="submit" className="ct-btn">show</button>
        <Link href="/contractors" className="muted small" style={{ marginLeft: 'auto' }}>Are you a main contractor? Post a job free</Link>
      </form>

      {!member && (
        <div className="job-lock">
          <strong>Members only.</strong> {email ? 'Start or renew your membership' : <><Link href="/login?next=/jobs">Log in</Link> or <Link href="/join">list your business</Link></>} to see who posted each job, read the full details and reply.
          {email && <> <Link href="/account">Go to my listing</Link></>}
        </div>
      )}

      {!jobs.length && <p className="ct-empty">{view === 'mine' ? <>No open jobs match your listing right now. <Link href="/jobs?view=all">See all jobs</Link></> : 'No open jobs right now. New ones are emailed to matching members as soon as they are posted.'}</p>}

      <div className="job-list">
        {jobs.map((j) => (
          <article key={j.id} className="job-card">
            <h2><Link href={`/jobs/${j.id}`}>{member ? j.title : `${j.trades.map(tradeLabel).join(', ')} package`}</Link></h2>
            <div className="ct-meta">
              <span><b>{member ? j.company : 'Main contractor'}</b></span>
              <span>{j.trades.map(tradeLabel).join(', ')}</span>
              <span>{j.town ? `${j.town}, ` : ''}{j.postcode.split(' ')[0]}</span>
              {valueBandLabel(j.value_band) && <span>{valueBandLabel(j.value_band)}</span>}
              {j.return_date && <span>Reply by {ukDate(j.return_date)}</span>}
              {member && matches(j) && <span className="ct-tag ok">Matches you</span>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
