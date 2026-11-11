import Link from 'next/link';
import { db } from '@/lib/supabase';
import { comingSoon } from '@/lib/launch';
import { TYPE_LABEL, type MemberType } from '@/lib/waitlistType';

export const dynamic = 'force-dynamic';

const when = (s: string) => new Date(s).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });

export default async function AdminWaitlist({ searchParams }: { searchParams: Promise<{ saved?: string; removed?: string; error?: string }> }) {
  const sp = await searchParams;
  const on = await comingSoon();
  const { data, error } = await db().from('waitlist').select('id, created_at, name, business_name, email, phone, code_sent_at, member_type, source').order('created_at', { ascending: false }).limit(5000);
  const rows = data ?? [];
  const nTrade = rows.filter((r) => r.member_type === 'trade').length;
  const nSupplier = rows.filter((r) => r.member_type === 'supplier').length;

  return (
    <div>
      <p><Link href="/admin">&larr; Back to listings</Link></p>
      <h1>Waiting list</h1>
      {sp.saved && <p className="ok-box">{sp.saved === 'on' ? 'The homepage now shows the coming soon page.' : 'The coming soon page is off. The homepage now shows the full site.'}</p>}
      {sp.removed && <p className="ok-box">Removed from the list.</p>}
      {sp.error && <p className="err big">{sp.error}</p>}
      {error && <p className="err big">The waiting list table is not set up yet (migration 022 needs running).</p>}

      <div className="panel" style={{ maxWidth: 720 }}>
        <h2 style={{ marginTop: 0 }}>Homepage</h2>
        <p>
          {on
            ? <>The homepage is showing the <strong>coming soon</strong> page with the waiting list form. The menus are hidden on that page only; every other page still works if you know the address.</>
            : <>The homepage is showing the <strong>full site</strong>. The waiting list form is not on show.</>}
        </p>
        <form method="post" action="/api/admin/waitlist" className="inline">
          <input type="hidden" name="action" value={on ? 'off' : 'on'} />
          <button type="submit">{on ? 'Launch: switch the coming soon page off' : 'Switch the coming soon page back on'}</button>
        </form>
        {' '}<a href="/" target="_blank" rel="noreferrer">View homepage</a>
      </div>

      <div className="admin-head">
        <h2 style={{ margin: 0 }}>{rows.length} on the list{rows.length ? <span className="muted small" style={{ fontWeight: 400 }}> · {nTrade} trade, {nSupplier} supplier</span> : null}</h2>
        {rows.length > 0 && <a href="/api/admin/waitlist">Download as a spreadsheet (CSV)</a>}
      </div>
      {!rows.length ? <p className="muted">Nobody yet.</p> : (
        <table className="table">
          <thead><tr><th>Joined</th><th>Name</th><th>Type</th><th>Business</th><th>Email</th><th>Phone</th><th>From</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{when(r.created_at)}</td>
                <td>{r.name}</td>
                <td>{r.member_type ? TYPE_LABEL[r.member_type as MemberType] : ''}</td>
                <td>{r.business_name}</td>
                <td><a href={`mailto:${r.email}`}>{r.email}</a></td>
                <td><a href={`tel:${r.phone.replace(/\s/g, '')}`}>{r.phone}</a></td>
                <td>{r.source === 'qr' ? 'QR code' : r.source ?? ''}</td>
                <td>
                  <form method="post" action="/api/admin/waitlist" className="inline">
                    <input type="hidden" name="action" value="remove" />
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className="linkish">remove</button>
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
