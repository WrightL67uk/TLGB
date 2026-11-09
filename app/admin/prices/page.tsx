import Link from 'next/link';
import { db } from '@/lib/supabase';
import { TURNOVER_BANDS } from '@/lib/config';
import { getPricing, PLAN_INFO, type PlanKey } from '@/lib/pricing';
import { PAID_STATUSES } from '@/lib/membership';

export const dynamic = 'force-dynamic';

export default async function AdminPrices({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  const sp = await searchParams;
  const pricing = await getPricing();
  const { data: paying } = await db()
    .from('businesses')
    .select('turnover_band, plan')
    .eq('status', 'approved')
    .eq('founding_member', false)
    .in('subscription_status', PAID_STATUSES);
  const rows = paying ?? [];
  const byBand = (k: string) => rows.filter((r) => r.turnover_band === k).length;
  const byPlan = (k: PlanKey) => rows.filter((r) => r.plan === k).length;
  const legacy = rows.filter((r) => !r.plan).length;

  return (
    <div>
      <p><Link href="/admin">&larr; Back to listings</Link></p>
      <h1>Prices</h1>
      <p className="muted">
        Yearly membership prices, in whole pounds. A change applies to new payments straight away. Members who have
        already paid stay on the price they joined at, including at renewal, until we tell them otherwise (the member
        terms promise 30 days&rsquo; notice before a price rise).
      </p>
      {sp.msg && <p className="ok-box">{sp.msg}</p>}
      {sp.error && <p className="err big">{sp.error}</p>}

      <form method="post" action="/api/admin/prices" style={{ maxWidth: 640 }}>
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>How members are charged</h2>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <input type="radio" name="mode" value="bands" defaultChecked={pricing.mode === 'bands'} style={{ width: 'auto', marginTop: 4 }} />
            <span><strong>By turnover band.</strong> One price per band. Every member gets every tool.</span>
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 8 }}>
            <input type="radio" name="mode" value="plans" defaultChecked={pricing.mode === 'plans'} style={{ width: 'auto', marginTop: 4 }} />
            <span><strong>Verified and Pro plans.</strong> Members choose a plan. The full leads feed and supply chain finder are Pro only. Members on Verified can upgrade any time.</span>
          </label>
        </div>

        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Turnover band prices {pricing.mode === 'bands' && <span className="status approved">charging now</span>}</h2>
          <table className="table">
            <thead><tr><th>Turnover</th><th>Price a year (£)</th><th>Paying members</th></tr></thead>
            <tbody>
              {TURNOVER_BANDS.map((b) => (
                <tr key={b.key}>
                  <td>{b.label}</td>
                  <td><input name={`band_${b.key}`} type="number" min="1" step="1" required defaultValue={pricing.bands[b.key]} style={{ maxWidth: 120 }} /></td>
                  <td>{byBand(b.key)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Plan prices {pricing.mode === 'plans' && <span className="status approved">charging now</span>}</h2>
          <table className="table">
            <thead><tr><th>Plan</th><th>Price a year (£)</th><th>Paying members</th></tr></thead>
            <tbody>
              {(['verified', 'pro'] as PlanKey[]).map((k) => (
                <tr key={k}>
                  <td><strong>{PLAN_INFO[k].label}</strong><br /><span className="muted small">{PLAN_INFO[k].blurb}</span></td>
                  <td><input name={`plan_${k}`} type="number" min="1" step="1" required defaultValue={pricing.plans[k]} style={{ maxWidth: 120 }} /></td>
                  <td>{byPlan(k)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="muted small">
          Founding members stay free whichever way you charge. Discount codes work with both.
          Members who joined on turnover pricing ({legacy} paying now) keep every tool, including Pro ones, if you switch to plans.
        </p>
        <button type="submit" className="primary">Save prices</button>
      </form>
    </div>
  );
}
