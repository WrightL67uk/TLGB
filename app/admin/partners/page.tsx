import Link from 'next/link';
import { db } from '@/lib/supabase';
import { siteUrl } from '@/lib/config';
import { PARTNER_KINDS, pounds, type Commission, type Partner } from '@/lib/partners';

export const dynamic = 'force-dynamic';

const ukDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const money = (pence: number) => pounds(pence);

function Post({ action, fields, label }: { action: string; fields: Record<string, string>; label: string }) {
  return (
    <form method="post" action="/api/admin/partners" style={{ display: 'inline' }}>
      <input type="hidden" name="action" value={action} />
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button type="submit">{label}</button>
    </form>
  );
}

export default async function AdminPartners({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  const sp = await searchParams;
  const [{ data: partners }, { data: clicks }, { data: referred }, { data: ledger }] = await Promise.all([
    db().from('partners').select('*').order('created_at', { ascending: false }),
    db().from('partner_clicks').select('partner_id').limit(50000),
    db().from('businesses').select('id, trading_name, status, subscription_status, partner_id, partner_at').not('partner_id', 'is', null).limit(5000),
    db().from('partner_commissions').select('*').order('created_at', { ascending: false }).limit(5000),
  ]);
  const list = (partners ?? []) as Partner[];
  const commissions = (ledger ?? []) as Commission[];
  const owedAll = commissions.filter((c) => c.status === 'earned').reduce((s, c) => s + c.amount_pence, 0);

  return (
    <div>
      <p><Link href="/admin">&larr; Back to listings</Link></p>
      <h1>Partners</h1>
      <p className="muted">
        People and firms who introduce trades and earn a monthly commission while those members keep paying. Each partner has a link
        ({siteUrl()}/p/CODE) and a private dashboard address you send them. Commission is earned on each paid invoice, never on the free trial.
      </p>
      {sp.msg && <p className="ok-box">{sp.msg}</p>}
      {sp.error && <p className="err big">{sp.error}</p>}
      {owedAll > 0 && <p><strong>{money(owedAll)}</strong> is owed to partners and not yet paid out.</p>}

      <h2>Add a partner</h2>
      <form method="post" action="/api/admin/partners" className="panel" style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
        <input type="hidden" name="action" value="create" />
        <label>Name (person or business)<input name="name" required maxLength={120} /></label>
        <label>Email<input name="email" type="email" required maxLength={200} /></label>
        <label>Type
          <select name="kind" defaultValue="">
            <option value="">Not sure</option>
            {PARTNER_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
        <label>Code for their link (optional, for example ACMENURSERY. Leave blank to make one from the name)
          <input name="code" maxLength={20} pattern="[A-Za-z0-9]*" style={{ textTransform: 'uppercase' }} />
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ flex: 1 }}>Monthly payment earns (£)
            <input name="monthly" type="number" min="0" step="0.01" defaultValue="10" required />
          </label>
          <label style={{ flex: 1 }}>Yearly payment earns (£)
            <input name="yearly" type="number" min="0" step="0.01" defaultValue="100" required />
          </label>
        </div>
        <label>Note for yourself<input name="note" maxLength={300} /></label>
        <div><button type="submit" className="primary">Add partner</button></div>
      </form>

      <h2>Your partners ({list.length})</h2>
      {!list.length && <p className="muted">No partners yet.</p>}
      {list.map((p) => {
        const mine = (referred ?? []).filter((b) => b.partner_id === p.id);
        const paying = mine.filter((b) => b.subscription_status === 'active').length;
        const trialing = mine.filter((b) => b.subscription_status === 'trialing').length;
        const visits = (clicks ?? []).filter((c) => c.partner_id === p.id).length;
        const rows = commissions.filter((c) => c.partner_id === p.id);
        const owed = rows.filter((c) => c.status === 'earned').reduce((s, c) => s + c.amount_pence, 0);
        const paidOut = rows.filter((c) => c.status === 'paid').reduce((s, c) => s + c.amount_pence, 0);
        return (
          <section key={p.id} className="panel" style={{ marginBottom: 14 }}>
            <h3 style={{ marginTop: 0 }}>
              {p.name} {p.status === 'suspended' && <span className="err">(switched off)</span>}
            </h3>
            <p className="muted small" style={{ margin: 0 }}>
              {p.kind ?? 'Type not set'} · {p.email} · added {ukDate(p.created_at)}{p.note ? ` · ${p.note}` : ''}
            </p>
            <p className="small">
              Link: <strong>{siteUrl()}/p/{p.code}</strong><br />
              Dashboard to send them: <Link href={`/partner/${p.dashboard_token}`}>{siteUrl()}/partner/{p.dashboard_token}</Link>
            </p>
            <p>
              {visits} visit{visits === 1 ? '' : 's'} · {mine.length} sign-up{mine.length === 1 ? '' : 's'} · {trialing} on trial · {paying} paying ·{' '}
              <strong>{money(owed)} owed</strong> · {money(paidOut)} paid out
            </p>
            <form method="post" action="/api/admin/partners" style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
              <input type="hidden" name="action" value="rates" />
              <input type="hidden" name="id" value={p.id} />
              <label className="small">Monthly earns (£)<input name="monthly" type="number" min="0" step="0.01" defaultValue={(p.monthly_pence / 100).toFixed(2)} style={{ width: 100 }} /></label>
              <label className="small">Yearly earns (£)<input name="yearly" type="number" min="0" step="0.01" defaultValue={(p.yearly_pence / 100).toFixed(2)} style={{ width: 100 }} /></label>
              <button type="submit">Save rates</button>
            </form>
            <p style={{ marginBottom: 0 }}>
              {owed > 0 && <><Post action="paid" fields={{ id: p.id }} label={`Mark ${money(owed)} as paid`} />{' '}</>}
              {p.status === 'approved'
                ? <Post action="suspend" fields={{ id: p.id }} label="Switch off" />
                : <Post action="activate" fields={{ id: p.id }} label="Switch on" />}
            </p>
            {mine.length > 0 && (
              <details style={{ marginTop: 10 }}>
                <summary>Members introduced ({mine.length})</summary>
                <ul>
                  {mine.map((b) => (
                    <li key={b.id}><Link href={`/admin/${b.id}`}>{b.trading_name}</Link> <span className="muted">({b.subscription_status === 'none' ? 'no payment yet' : b.subscription_status})</span></li>
                  ))}
                </ul>
              </details>
            )}
            {rows.length > 0 && (
              <details style={{ marginTop: 10 }}>
                <summary>Commission ledger ({rows.length})</summary>
                <table className="table">
                  <thead><tr><th>Date</th><th>Member</th><th>Amount</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {rows.map((c) => (
                      <tr key={c.id}>
                        <td>{ukDate(c.created_at)}</td>
                        <td>{c.business_name ?? 'Deleted listing'}{c.note && <><br /><span className="muted small">{c.note}</span></>}</td>
                        <td>{money(c.amount_pence)}</td>
                        <td>{c.status === 'paid' && c.paid_at ? `Paid ${ukDate(c.paid_at)}` : c.status === 'earned' ? 'Owed' : 'Reversed'}</td>
                        <td>{c.status === 'earned' && <Post action="reverse" fields={{ commission: c.id }} label="Reverse" />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )}
          </section>
        );
      })}
    </div>
  );
}
