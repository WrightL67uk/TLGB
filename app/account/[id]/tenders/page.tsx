import Link from 'next/link';
import { db } from '@/lib/supabase';
import { sectorLabel } from '@/lib/contractors';
import { loadMember, TenderHead } from './shared';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your tenders | TLGB' };

const ukDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const TAG: Record<string, [string, string]> = {
  draft: ['draft', 'Draft'], pending: ['warn', 'Waiting for approval'], open: ['ok', 'Open'], closed: ['', 'Closed'],
};

export default async function MemberTenders({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; sent?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { me, name } = await loadMember(id, `/account/${id}/tenders`);
  const { data: jobs } = await db().from('contractor_jobs').select('id, title, status, sector, return_date, published_at, created_at, rejection_reason')
    .eq('company_id', me.company.id).neq('status', 'removed').order('created_at', { ascending: false }).limit(100);
  const ids = (jobs ?? []).map((j) => j.id as string);
  const { data: replies } = ids.length ? await db().from('contractor_job_replies').select('job_id, status').in('job_id', ids) : { data: [] as { job_id: string; status: string }[] };

  return (
    <div className="ct-page">
      <TenderHead id={id} name={name} />
      {sp.error && <p className="err big">{sp.error}</p>}
      {sp.sent && <p className="ct-banner ok">Sent for approval. We check every tender before it goes to members, usually within one working day.</p>}
      <p className="muted">Post work you want priced, for example a groundworker looking for landscapers. Every tender is checked by us first, then emailed to the members who match.</p>
      <p><Link href={`/account/${id}/tenders/new`} className="ct-btn go">Post a tender</Link></p>
      {!jobs?.length && <p className="ct-empty">You have not posted any tenders yet.</p>}
      {(jobs ?? []).map((j) => {
        const r = (replies ?? []).filter((x) => x.job_id === j.id);
        const [cls, label] = TAG[j.status as string] ?? ['', j.status as string];
        return (
          <div key={j.id} className="ct-row">
            <div className="grow">
              <h3><Link href={`/account/${id}/tenders/${j.id}`}>{j.title}</Link> <span className={`ct-tag ${cls}`}>{label}</span></h3>
              <div className="ct-meta">
                <span>{sectorLabel(j.sector)}</span>
                {j.published_at && <span>Sent {ukDate(j.published_at)}</span>}
                {j.status !== 'draft' && j.status !== 'pending' && <span>{r.length} repl{r.length === 1 ? 'y' : 'ies'}{r.filter((x) => x.status === 'new').length ? ` (${r.filter((x) => x.status === 'new').length} new)` : ''}</span>}
              </div>
              {j.status === 'draft' && j.rejection_reason && <p className="err">Not approved: {j.rejection_reason}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
