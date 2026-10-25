import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db } from '@/lib/supabase';
import { getSessionEmail } from '@/lib/session';
import { tradeLabel } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My listing | TLGB' };

const STATUS: Record<string, string> = {
  pending_review: 'Waiting for approval',
  approved: 'Live',
  rejected: 'Not approved',
  suspended: 'Suspended',
};

export default async function AccountPage() {
  const email = await getSessionEmail();
  if (!email) redirect('/login');

  const { data: rows } = await db()
    .from('businesses')
    .select('id, trading_name, status, trades, pl_expiry')
    .eq('email', email)
    .neq('status', 'draft')
    .order('created_at');

  if (rows?.length === 1) redirect(`/account/${rows[0].id}`);
  if (!rows?.length) {
    const { count } = await db().from('contractor_users').select('id', { count: 'exact', head: true }).eq('email', email).is('removed_at', null);
    if (count) redirect('/contractor');
    const { count: js } = await db().from('job_seekers').select('id', { count: 'exact', head: true }).eq('email', email).neq('status', 'removed');
    if (js) redirect('/seeker');
  }

  return (
    <div className="narrow">
      <div className="account-head">
        <h1>My listings</h1>
        <form action="/api/auth/logout" method="post"><button type="submit">Log out</button></form>
      </div>
      <p className="muted">Logged in as {email}</p>
      {!rows?.length ? (
        <p>There are no listings under this email address. <Link href="/join">List your business</Link></p>
      ) : (
        <div className="results">
          {rows.map((r) => (
            <Link key={r.id} href={`/account/${r.id}`} className="card">
              <div className="card-body">
                <h3>{r.trading_name}</h3>
                <p className="muted">{r.trades.map(tradeLabel).join(', ')}</p>
                <span className={`status ${r.status}`}>{STATUS[r.status] ?? r.status}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
