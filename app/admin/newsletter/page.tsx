import Link from 'next/link';
import { db } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function AdminNewsletter() {
  const { data, error } = await db().from('newsletter_subscribers').select('id, created_at, name, email, confirmed_at, unsubscribed_at, source').order('created_at', { ascending: false }).limit(500);
  const rows = data ?? [];
  const live = rows.filter((r) => r.confirmed_at && !r.unsubscribed_at).length;
  const pending = rows.filter((r) => !r.confirmed_at && !r.unsubscribed_at).length;
  const gone = rows.filter((r) => r.unsubscribed_at).length;
  const when = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' });
  return (
    <div>
      <p><Link href="/admin">&larr; Back to listings</Link></p>
      <h1>Newsletter subscribers</h1>
      {error && <p className="err big">The newsletter table is not set up yet (migration 044 needs running).</p>}
      <p><strong>{live}</strong> confirmed, <strong>{pending}</strong> waiting to confirm, <strong>{gone}</strong> unsubscribed. The page address to share is <Link href="/newsletter">tlgb.co.uk/newsletter</Link>.</p>
      <p><a href="/api/admin/newsletter">Download confirmed subscribers (CSV)</a>. Only people who confirmed and have not unsubscribed are included. Only email people from this list.</p>
      <table>
        <thead><tr><th>Signed up</th><th>Name</th><th>Email</th><th>Status</th><th>From</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{when(r.created_at)}</td><td>{r.name}</td><td>{r.email}</td>
              <td>{r.unsubscribed_at ? 'Unsubscribed' : r.confirmed_at ? 'Confirmed' : 'Waiting to confirm'}</td>
              <td>{r.source ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
