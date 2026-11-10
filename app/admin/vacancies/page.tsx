import Link from 'next/link';
import { db } from '@/lib/supabase';
import { vacancyLive, type Vacancy } from '@/lib/vacancies';

export const dynamic = 'force-dynamic';

const day = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default async function AdminVacancies({ searchParams }: { searchParams: Promise<{ done?: string; error?: string }> }) {
  const sp = await searchParams;
  const { data, error } = await db().from('vacancies').select('*, businesses(id, trading_name)').order('created_at', { ascending: false }).limit(500);
  const rows = (data ?? []) as (Vacancy & { businesses: { id: string; trading_name: string } | null })[];
  const { count: alerts } = await db().from('recruit_alerts').select('id', { count: 'exact', head: true });
  const { count: seekersOn } = await db().from('job_seekers').select('id', { count: 'exact', head: true }).eq('status', 'live').eq('vacancy_alerts', true);

  return (
    <div>
      <p><Link href="/admin">&larr; Back to listings</Link></p>
      <h1>Vacancies</h1>
      <p className="muted">Posted by paying members on the Recruitment page. Each member gets 5 posts; change that on their listing page under Membership. {seekersOn ?? 0} job seekers get vacancy emails, and employers have {alerts ?? 0} saved searches.</p>
      {sp.done && <p className="ok-box">Done.</p>}
      {(sp.error || error) && <p className="err big">{sp.error ?? 'The vacancies table is not set up yet (migration 024).'}</p>}
      {!rows.length ? <p className="muted">No vacancies yet.</p> : (
        <table className="table">
          <thead><tr><th>Posted</th><th>Vacancy</th><th>Member</th><th>Status</th><th>Views</th><th></th></tr></thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id}>
                <td>{day(v.created_at)}</td>
                <td><Link href={`/recruitment/vacancies/${v.id}`}>{v.title}</Link><br /><span className="muted small">{v.area}</span></td>
                <td>{v.businesses ? <Link href={`/admin/${v.businesses.id}`}>{v.businesses.trading_name}</Link> : ''}</td>
                <td>{v.status === 'removed' ? 'Removed by admin' : vacancyLive(v) ? `Live until ${day(v.expires_at)}` : v.status === 'closed' ? 'Closed' : 'Ended'}</td>
                <td>{v.view_count}</td>
                <td>
                  <form method="post" action="/api/admin/vacancies" className="inline">
                    <input type="hidden" name="id" value={v.id} />
                    <input type="hidden" name="action" value={v.status === 'removed' ? 'restore' : 'remove'} />
                    <button type="submit" className="linkish">{v.status === 'removed' ? 'restore' : 'remove'}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
