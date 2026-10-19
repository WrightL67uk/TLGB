import Link from 'next/link';
import { db } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const TABS = [
  { key: 'pending_review', label: 'Awaiting approval' },
  { key: 'recheck', label: 'Changes to check' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'suspended', label: 'Suspended' },
];

export default async function AdminQueue({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: s } = await searchParams;
  const status = TABS.some((t) => t.key === s) ? s! : 'pending_review';

  // "recheck" is approved listings with changes waiting for a look; the rest are statuses
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scope = (q: any, key: string) =>
    key === 'recheck' ? q.eq('status', 'approved').eq('recheck_required', true) : q.eq('status', key);

  const [{ data: rows }, counts]: [{ data: { id: string; created_at: string; trading_name: string; business_type: string; company_number: string | null; base_postcode: string; email: string; pl_expiry: string | null }[] | null }, Record<string, number>] = await Promise.all([
    scope(
      db()
        .from('businesses')
        .select('id, created_at, trading_name, business_type, company_number, base_postcode, email, pl_expiry'),
      status
    )
      .order('created_at', { ascending: status === 'pending_review' || status === 'recheck' })
      .limit(200),
    Promise.all(
      TABS.map(async (t) => {
        const { count } = await scope(db().from('businesses').select('id', { count: 'exact', head: true }), t.key);
        return [t.key, count ?? 0] as const;
      })
    ).then((x) => Object.fromEntries(x)),
  ]);

  return (
    <div>
      <h1>Admin</h1>
      <nav className="tabs">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin?status=${t.key}`} className={t.key === status ? 'on' : ''}>
            {t.label} <span className="count">{counts[t.key]}</span>
          </Link>
        ))}
      </nav>

      {!rows?.length ? (
        <p className="muted">Nothing here.</p>
      ) : (
        <table className="table">
          <thead>
            <tr><th>Submitted</th><th>Business</th><th>Type</th><th>Postcode</th><th>PL expiry</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.created_at).toLocaleDateString('en-GB')}</td>
                <td><Link href={`/admin/${r.id}`}>{r.trading_name}</Link><br /><span className="muted small">{r.email}</span></td>
                <td>{r.business_type === 'ltd' ? `Ltd ${r.company_number}` : 'Sole trader'}</td>
                <td>{r.base_postcode}</td>
                <td>{r.pl_expiry ? new Date(r.pl_expiry).toLocaleDateString('en-GB') : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
