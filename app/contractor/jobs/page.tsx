import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db } from '@/lib/supabase';
import { getContractor, jobIsOpen, type Job } from '@/lib/contractors';
import { tradeLabel } from '@/lib/config';
import ContractorNav from '../ContractorNav';
import '../../contractor.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Jobs | TLGB' };

const ukDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default async function ContractorJobs({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await getContractor();
  if (!me) redirect('/login?next=/contractor/jobs');
  const { error } = await searchParams;
  const { data } = await db().from('contractor_jobs').select('*').eq('company_id', me.company.id).neq('status', 'removed').order('created_at', { ascending: false }).limit(200);
  const jobs = (data ?? []) as Job[];
  const ids = jobs.map((j) => j.id);
  const { data: replies } = ids.length ? await db().from('contractor_job_replies').select('job_id, status').in('job_id', ids) : { data: [] as never[] };

  const groups: [string, Job[]][] = [
    ['Drafts', jobs.filter((j) => j.status === 'draft')],
    ['Open', jobs.filter((j) => jobIsOpen(j))],
    ['Closed', jobs.filter((j) => j.status !== 'draft' && !jobIsOpen(j))],
  ];

  return (
    <div className="ct-page">
      <ContractorNav me={me} on="jobs" />
      {error && <p className="err big">{error}</p>}
      <div className="ct-actions" style={{ marginBottom: 16 }}>
        {me.can.canPostJobs && <Link href="/contractor/jobs/new" className="ct-btn go">Post a job</Link>}
        <span className="muted small">Open jobs on your plan: up to {me.can.maxLiveJobs}.</span>
      </div>
      {!jobs.length && <p className="ct-empty">No jobs yet.</p>}
      {groups.filter(([, list]) => list.length).map(([label, list]) => (
        <section key={label} className="ct-box">
          <h2>{label} ({list.length})</h2>
          {list.map((j) => {
            const r = (replies ?? []).filter((x) => x.job_id === j.id);
            const fresh = r.filter((x) => x.status === 'new').length;
            return (
              <div key={j.id} className="ct-row">
                <div className="grow">
                  <Link href={`/contractor/jobs/${j.id}`}><strong>{j.title}</strong></Link>
                  <div className="ct-meta">
                    <span>{j.trades.map(tradeLabel).join(', ')}</span>
                    <span>{j.town ? `${j.town}, ` : ''}{j.postcode}</span>
                    {j.return_date && <span>Reply by {ukDate(j.return_date)}</span>}
                    {j.published_at && <span>Sent to {j.notified_count}</span>}
                  </div>
                </div>
                <div className="ct-meta"><b>{r.length}</b> repl{r.length === 1 ? 'y' : 'ies'}{fresh ? <span className="ct-tag warn">{fresh} new</span> : null}</div>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
