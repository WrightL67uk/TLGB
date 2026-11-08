import Link from 'next/link';
import { db } from '@/lib/supabase';
import { stripeEnabled } from '@/lib/stripe';
import { describe, usable, type DiscountCode } from '@/lib/discounts';

export const dynamic = 'force-dynamic';

const ukDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const pounds = (p: number) => `£${(p / 100).toFixed(2)}`;

function Act({ id, action, label }: { id: string; action: string; label: string }) {
  return (
    <form method="post" action="/api/admin/codes" style={{ display: 'inline' }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={action} />
      <button type="submit">{label}</button>
    </form>
  );
}

export default async function AdminCodes({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  const sp = await searchParams;
  const [{ data: codes }, { data: uses }, { data: arrivals }] = await Promise.all([
    db().from('discount_codes').select('*').order('created_at', { ascending: false }),
    db().from('discount_redemptions').select('id, created_at, code_id, business_id, amount_off_pence, businesses(trading_name)').order('created_at', { ascending: false }).limit(500),
    db().from('businesses').select('id, trading_name, signup_code, status, subscription_status, created_at').not('signup_code', 'is', null).neq('status', 'draft').order('created_at', { ascending: false }).limit(500),
  ]);
  const list = (codes ?? []) as DiscountCode[];
  const usesFor = (id: string) => (uses ?? []).filter((u) => u.code_id === id);
  const arrivedWith = (code: string) => (arrivals ?? []).filter((b) => b.signup_code === code);
  const live = stripeEnabled();

  return (
    <div>
      <p><Link href="/admin">&larr; Back to listings</Link></p>
      <h1>Discount codes</h1>
      <p className="muted">
        Codes take money off the yearly listing. Members can type a code on the payment page, or you can share a link
        with the code already in it, and it is applied for them when they pay.
      </p>
      {!live && <p className="err big">Online payment is not switched on yet. Codes are saved here and sent to Stripe once it is.</p>}
      {sp.msg && <p className="ok-box">{sp.msg}</p>}
      {sp.error && <p className="err big">{sp.error}</p>}

      <h2>Make a code</h2>
      <form method="post" action="/api/admin/codes" className="panel" style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
        <input type="hidden" name="action" value="create" />
        <label>Code (letters and numbers, for example TRUDY25)
          <input name="code" required minLength={3} maxLength={20} pattern="[A-Za-z0-9]+" style={{ textTransform: 'uppercase' }} />
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
          <label style={{ flex: 1 }}>Discount
            <input name="value" type="number" min="0.01" step="0.01" required />
          </label>
          <label style={{ flex: 1 }}>&nbsp;
            <select name="kind" defaultValue="percent">
              <option value="percent">% off</option>
              <option value="amount">£ off</option>
            </select>
          </label>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
          <label style={{ flex: 2 }}>How long it lasts
            <select name="duration" defaultValue="once">
              <option value="once">First year only</option>
              <option value="years">A number of years</option>
              <option value="forever">Every year while they stay a member</option>
            </select>
          </label>
          <label style={{ flex: 1 }}>Years (if a number)
            <input name="years" type="number" min="1" max="10" defaultValue="2" />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ flex: 1 }}>Most times it can be used (blank for no limit)
            <input name="max_uses" type="number" min="1" />
          </label>
          <label style={{ flex: 1 }}>Last day it works (optional)
            <input name="expires_on" type="date" />
          </label>
        </div>
        <label><input type="checkbox" name="first_time_only" /> New members only (not for someone who has paid before)</label>
        <label>Note for yourself (who it is for, where it was shared)
          <input name="note" maxLength={200} />
        </label>
        <div><button type="submit" className="primary">Make code</button></div>
      </form>

      <h2>Your codes ({list.length})</h2>
      {!list.length && <p className="muted">No codes yet.</p>}
      {list.length > 0 && (
        <table className="table">
          <thead>
            <tr><th>Code</th><th>Discount</th><th>Used</th><th>Limits</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {list.map((c) => {
              const u = usesFor(c.id);
              const ok = usable(c, u.length);
              const saved = u.reduce((s, x) => s + (x.amount_off_pence ?? 0), 0);
              const arrived = arrivedWith(c.code);
              return (
                <tr key={c.id}>
                  <td>
                    <strong>{c.code}</strong>
                    {c.note && <><br /><span className="muted">{c.note}</span></>}
                    <br /><span className="muted">Link: tlgb.co.uk/join?code={c.code}</span>
                  </td>
                  <td>{describe(c)}{c.first_time_only && <><br /><span className="muted">New members only</span></>}</td>
                  <td>
                    {u.length} paid{saved > 0 && <> ({pounds(saved)} off)</>}
                    {u.map((x) => (
                      <div key={x.id} className="muted">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {x.business_id ? <Link href={`/admin/${x.business_id}`}>{(x.businesses as any)?.trading_name ?? 'Listing'}</Link> : 'Deleted listing'}, {ukDate(x.created_at)}
                      </div>
                    ))}
                    {arrived.length > 0 && <div className="muted">{arrived.length} signed up through the link</div>}
                  </td>
                  <td>
                    {c.max_uses ? `Up to ${c.max_uses} uses` : 'No use limit'}
                    <br />{c.expires_on ? `Until ${ukDate(c.expires_on)}` : 'No end date'}
                  </td>
                  <td>
                    {ok ? 'Working' : !c.active ? 'Switched off' : 'Used up or ended'}
                    {live && !c.stripe_promo_id && <><br /><span className="err">Not in Stripe yet</span></>}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {c.active ? <Act id={c.id} action="off" label="Switch off" /> : <Act id={c.id} action="on" label="Switch on" />}
                    {live && !c.stripe_promo_id && <> <Act id={c.id} action="stripe" label="Send to Stripe" /></>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
