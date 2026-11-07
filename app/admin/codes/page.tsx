import Link from 'next/link';
import { db } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Codes | TLGB admin' };

const ukDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

type Code = { code: string; label: string; pro_months: number; max_redemptions: number | null; redeem_by: string | null; active: boolean; created_at: string };
type Redemption = { business_id: string; code: string; redeemed_at: string; pro_until: string };

export default async function AdminCodes({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const { msg } = await searchParams;
  const [{ data: codes }, { data: reds }] = await Promise.all([
    db().from('promo_codes').select('*').order('created_at', { ascending: false }),
    db().from('promo_redemptions').select('*').order('redeemed_at', { ascending: false }).limit(500),
  ]);
  const ids = [...new Set((reds ?? []).map((r) => r.business_id))];
  const { data: biz } = ids.length
    ? await db().from('businesses').select('id, trading_name, plan, subscription_status').in('id', ids)
    : { data: [] as { id: string; trading_name: string; plan: string; subscription_status: string }[] };
  const name = (id: string) => biz?.find((b) => b.id === id);
  const used = (code: string) => (reds ?? []).filter((r: Redemption) => r.code === code);
  const today = new Date().toISOString().slice(0, 10);
  const totalUsed = (reds ?? []).length;
  const keptPro = (reds ?? []).filter((r: Redemption) => name(r.business_id)?.plan === 'pro').length;

  return (
    <div>
      <p><Link href="/admin">&larr; Admin</Link></p>
      <h1>Codes</h1>
      <p className="muted">Each code gives Pro free for its number of months when a trade pays for Verified. Use one code per marketing channel to see what brings members in.</p>
      {msg && <p className="ok-box">{msg}</p>}

      <section className="panel">
        <h2>New code</h2>
        <form method="post" action="/api/admin/codes" style={{ display: "grid", gap: 12, maxWidth: 420 }}>
          <input type="hidden" name="action" value="create" />
          <label>Code <span className="muted small">letters and numbers, 3 to 20, e.g. TAPE12</span>
            <input name="code" required maxLength={20} pattern="[A-Za-z0-9]{3,20}" style={{ textTransform: 'uppercase' }} /></label>
          <label>Where it&rsquo;s used <span className="muted small">e.g. Tape measures, Futurescape 2027</span>
            <input name="label" required maxLength={80} /></label>
          <label>Months of free Pro<input name="pro_months" type="number" min={1} max={24} defaultValue={12} /></label>
          <label>Most uses allowed <span className="muted small">leave blank for no limit</span><input name="max_redemptions" type="number" min={1} /></label>
          <label>Use by <span className="muted small">last day the code works</span><input name="redeem_by" type="date" /></label>
          <button type="submit" className="primary">Create code</button>
        </form>
      </section>

      <section className="panel">
        <h2>All codes</h2>
        <p className="muted small">{totalUsed} used in total. {keptPro} of those have since chosen to pay for Pro.</p>
        {(codes ?? []).length === 0 ? <p className="muted">No codes yet.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead><tr><th>Code</th><th>Where it&rsquo;s used</th><th>Free Pro</th><th>Used</th><th>Use by</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {(codes as Code[]).map((c) => {
                  const n = used(c.code).length;
                  const expired = !!c.redeem_by && c.redeem_by < today;
                  const full = !!c.max_redemptions && n >= c.max_redemptions;
                  return (
                    <tr key={c.code}>
                      <td><strong>{c.code}</strong></td>
                      <td>{c.label}</td>
                      <td>{c.pro_months} months</td>
                      <td>{n}{c.max_redemptions ? ` of ${c.max_redemptions}` : ''}</td>
                      <td>{c.redeem_by ? ukDate(c.redeem_by) : 'No end date'}</td>
                      <td>{!c.active ? 'Switched off' : expired ? 'Expired' : full ? 'All used' : 'Live'}</td>
                      <td>
                        <form method="post" action="/api/admin/codes" style={{ display: 'inline' }}>
                          <input type="hidden" name="action" value={c.active ? 'off' : 'on'} />
                          <input type="hidden" name="code" value={c.code} />
                          <button type="submit">{c.active ? 'Switch off' : 'Switch on'}</button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Who used a code</h2>
        {(reds ?? []).length === 0 ? <p className="muted">Nobody yet.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead><tr><th>Listing</th><th>Code</th><th>Joined</th><th>Free Pro until</th><th>Now</th></tr></thead>
              <tbody>
                {(reds as Redemption[]).map((r) => {
                  const b = name(r.business_id);
                  return (
                    <tr key={r.business_id}>
                      <td>{b ? <Link href={`/admin/${r.business_id}`}>{b.trading_name}</Link> : 'Removed'}</td>
                      <td>{r.code}</td>
                      <td>{ukDate(r.redeemed_at)}</td>
                      <td>{ukDate(r.pro_until)}</td>
                      <td>{!b ? '' : b.plan === 'pro' ? 'Paying for Pro' : b.subscription_status === 'cancelled' ? 'Left' : 'Verified'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
