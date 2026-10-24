import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db } from '@/lib/supabase';
import { getContractor, jobIsOpen, type Job } from '@/lib/contractors';
import { tradeWarnings, type StatusRow } from '@/lib/tradeStatus';
import ContractorNav from './ContractorNav';
import '../contractor.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Contractor dashboard | TLGB' };

const ukDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default async function ContractorHome() {
  const me = await getContractor();
  if (!me) redirect('/login?next=/contractor');
  const cid = me.company.id;

  const [{ data: favs }, { data: jobs }, { count: team }] = await Promise.all([
    db().from('contractor_favourites').select('business_id').eq('company_id', cid),
    db().from('contractor_jobs').select('id, title, status, return_date, published_at, created_at').eq('company_id', cid).neq('status', 'removed').order('created_at', { ascending: false }).limit(50),
    db().from('contractor_users').select('id', { count: 'exact', head: true }).eq('company_id', cid).is('removed_at', null),
  ]);
  const favIds = (favs ?? []).map((f) => f.business_id as string);
  const jobIds = (jobs ?? []).map((j) => j.id as string);

  const [{ data: favRows }, { data: replies }] = await Promise.all([
    favIds.length
      ? db().from('businesses').select('id, trading_name, status, founding_member, subscription_status, pl_expiry, el_expiry, el_cover_amount, accreditations, accreditation_expiries').in('id', favIds)
      : Promise.resolve({ data: [] as never[] }),
    jobIds.length
      ? db().from('contractor_job_replies').select('job_id, status').in('job_id', jobIds)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const needAttention = (favRows ?? [])
    .map((b) => ({ b, w: tradeWarnings(b as StatusRow).filter((x) => x.tone !== 'ok') }))
    .filter((x) => x.w.length);
  const openJobs = (jobs ?? []).filter((j) => jobIsOpen(j as Job));
  const drafts = (jobs ?? []).filter((j) => j.status === 'draft');
  const newReplies = (replies ?? []).filter((r) => r.status === 'new');
  const repliesFor = (id: string) => (replies ?? []).filter((r) => r.job_id === id);

  return (
    <div className="ct-page">
      <ContractorNav me={me} on="home" />

      <div className="ct-stats">
        <Link href="/contractor/shortlist" className="ct-stat"><b>{favIds.length}</b><span>trades on your shortlist</span></Link>
        <Link href="/contractor/jobs" className="ct-stat"><b>{openJobs.length}</b><span>open jobs</span></Link>
        <Link href="/contractor/jobs" className="ct-stat"><b>{newReplies.length}</b><span>new replies</span></Link>
        <Link href="/contractor/team" className="ct-stat"><b>{team ?? 1}</b><span>people on your account</span></Link>
      </div>

      <div className="ct-actions" style={{ marginBottom: 18 }}>
        {me.company.status === 'approved' && me.can.canPostJobs && <Link href="/contractor/jobs/new" className="ct-btn go">Post a job</Link>}
        <Link href="/search" className="ct-btn">Find trades to shortlist</Link>
      </div>

      {needAttention.length > 0 && (
        <section className="ct-box">
          <h2>Paperwork to watch</h2>
          <p className="muted small">Saved trades whose insurance or accreditations have lapsed or expire within 30 days.</p>
          {needAttention.slice(0, 10).map(({ b, w }) => (
            <div key={b.id} className="ct-row">
              <div className="grow"><Link href={`/b/${b.id}`}><strong>{b.trading_name}</strong></Link></div>
              <div>{w.map((x) => <span key={x.text} className={`ct-tag ${x.tone}`}>{x.text}</span>)}</div>
            </div>
          ))}
          {needAttention.length > 10 && <p><Link href="/contractor/shortlist">See all {needAttention.length}</Link></p>}
        </section>
      )}

      <section className="ct-box">
        <h2>Your jobs</h2>
        {!jobs?.length && <p className="ct-empty">No jobs yet. {me.company.status === 'approved' ? <Link href="/contractor/jobs/new">Post your first job</Link> : 'You can post jobs once your company is approved.'}</p>}
        {[...drafts, ...openJobs].slice(0, 8).map((j) => {
          const r = repliesFor(j.id);
          return (
            <div key={j.id} className="ct-row">
              <div className="grow">
                <Link href={`/contractor/jobs/${j.id}`}><strong>{j.title}</strong></Link>
                <div className="ct-meta">
                  {j.status === 'draft' ? <span className="ct-tag draft">Draft, not sent yet</span> : <span className="ct-tag ok">Open</span>}
                  {j.return_date && <span>Reply by {ukDate(j.return_date)}</span>}
                </div>
              </div>
              <div className="ct-meta"><b>{r.length}</b> repl{r.length === 1 ? 'y' : 'ies'}{r.some((x) => x.status === 'new') ? `, ${r.filter((x) => x.status === 'new').length} new` : ''}</div>
            </div>
          );
        })}
        {(jobs?.length ?? 0) > 0 && <p style={{ marginTop: 10 }}><Link href="/contractor/jobs">All jobs</Link></p>}
      </section>
    </div>
  );
}
