import Link from 'next/link';
import { db } from '@/lib/supabase';
import { currentAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

const when = (s: string | null) => s ? new Date(s).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }) : 'Never';

export default async function AdminAdmins({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  const sp = await searchParams;
  const me = await currentAdmin();
  const { data, error } = await db().from('admin_users').select('id, name, email, password_hash, token_expires_at, invited_by, last_login_at, created_at').is('removed_at', null).order('created_at');
  const rows = data ?? [];

  return (
    <div>
      <p><Link href="/admin">&larr; Back to listings</Link></p>
      <h1>Admins</h1>
      <p className="muted">Everyone here can log in to admin at tlgb.co.uk/admin with their own email and password, and can add or remove other admins.</p>
      {sp.msg && <p className="ok-box">{sp.msg.slice(0, 300)}</p>}
      {sp.error && <p className="err big">{sp.error.slice(0, 300)}</p>}
      {error && <p className="err big">The admins table is not set up yet (migration 023 needs running).</p>}

      <form method="post" action="/api/admin/admins" className="panel stack" style={{ maxWidth: 520 }}>
        <h2 style={{ margin: 0 }}>Add an admin</h2>
        <input type="hidden" name="action" value="add" />
        <label>Name<input name="name" required maxLength={100} /></label>
        <label>Email<input name="email" type="email" required maxLength={200} /></label>
        <p className="hint">We email them a link to choose their own password. The link runs out after 3 days.</p>
        <button type="submit">Add admin and send invite</button>
      </form>

      <h2>{rows.length} {rows.length === 1 ? 'admin' : 'admins'}</h2>
      {!rows.length ? <p className="muted">No admins added yet. You are using the master login.</p> : (
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Last login</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const invitePending = !r.password_hash;
              const expired = invitePending && (!r.token_expires_at || new Date(r.token_expires_at) < new Date());
              return (
                <tr key={r.id}>
                  <td>{r.name}{me?.id === r.id && <span className="muted small"> (you)</span>}</td>
                  <td>{r.email}</td>
                  <td>{invitePending ? (expired ? 'Invite ran out' : 'Invite sent') : 'Active'}<br /><span className="muted small">Added by {r.invited_by ?? 'admin'}</span></td>
                  <td>{when(r.last_login_at)}</td>
                  <td>
                    <div className="inline">
                      {invitePending && (
                        <form method="post" action="/api/admin/admins">
                          <input type="hidden" name="action" value="resend" /><input type="hidden" name="id" value={r.id} />
                          <button type="submit" className="linkish">resend invite</button>
                        </form>
                      )}
                      {me?.id !== r.id && (
                        <form method="post" action="/api/admin/admins">
                          <input type="hidden" name="action" value="remove" /><input type="hidden" name="id" value={r.id} />
                          <button type="submit" className="linkish">remove</button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <p className="muted small" style={{ marginTop: 24 }}>The master login (the username and password saved in Vercel) always works too, so you cannot lock yourselves out.</p>
    </div>
  );
}
