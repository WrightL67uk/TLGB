import Link from 'next/link';
import { db } from '@/lib/supabase';
import { TURNOVER_BANDS } from '@/lib/config';
import { getPricing, yearlySaving, PLAN_INFO, type PlanKey } from '@/lib/pricing';
import { PAID_STATUSES } from '@/lib/membership';
import { getSupplierPricing, TIER_INFO, SUPPLIER_TIERS } from '@/lib/supplierPricing';

export const dynamic = 'force-dynamic';

export default async function AdminPrices({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  const sp = await searchParams;
  const pricing = await getPricing();
  const { data: paying } = await db()
    .from('businesses')
    .select('turnover_band, plan, billing_interval')
    .eq('status', 'approved')
    .eq('founding_member', false)
    .in('subscription_status', PAID_STATUSES);
  const rows = paying ?? [];
  const byBand = (k: string) => rows.filter((r) => r.turnover_band === k).length;
  const byPlan = (k: PlanKey) => rows.filter((r) => r.plan === k).length;
  const legacy = rows.filter((r) => !r.plan).length;
  const byInterval = (k: string) => rows.filter((r) => r.billing_interval === k).length;
  const { count: freeCount } = await db().from('businesses').select('id', { count: 'exact', head: true }).eq('status', 'approved').eq('free_listing', true).not('subscription_status', 'in', `(${PAID_STATUSES.join(',')})`);
  const save = yearlySaving(pricing);
  const supplierPrices = await getSupplierPricing();
  const { data: sups } = await db().from('suppliers').select('tier, subscription_status').not('tier', 'is', null).in('subscription_status', PAID_STATUSES);
  const supCount = (k: string) => (sups ?? []).filter((r) => r.tier === k).length;

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
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 8 }}>
            <input type="radio" name="mode" value="membership" defaultChecked={pricing.mode === 'membership'} style={{ width: 'auto', marginTop: 4 }} />
            <span><strong>Free, monthly or yearly.</strong> Once approved, members choose a free listing (shown as unverified) or verified membership paid monthly or yearly, with a free trial. Every verified member gets every tool.</span>
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

        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Free, monthly or yearly {pricing.mode === 'membership' && <span className="status approved">charging now</span>}</h2>
          <table className="table">
            <thead><tr><th>Option</th><th>Price (£)</th><th>Members</th></tr></thead>
            <tbody>
              <tr><td><strong>Free listing</strong><br /><span className="muted small">Shown as unverified, no member tools</span></td><td>0</td><td>{freeCount ?? 0}</td></tr>
              <tr>
                <td><strong>Verified, paid monthly</strong><br /><span className="muted small">Price a month</span></td>
                <td><input name="mem_monthly" type="number" min="1" step="1" required defaultValue={pricing.membership.monthly} style={{ maxWidth: 120 }} /></td>
                <td>{byInterval('month')}</td>
              </tr>
              <tr>
                <td><strong>Verified, paid yearly</strong><br /><span className="muted small">Price a year. Must be less than 12 monthly payments.</span></td>
                <td><input name="mem_yearly" type="number" min="1" step="1" required defaultValue={pricing.membership.yearly} style={{ maxWidth: 120 }} /></td>
                <td>{byInterval('year')}</td>
              </tr>
              <tr>
                <td><strong>Free trial</strong><br /><span className="muted small">Days before the first payment, on both. 0 for none.</span></td>
                <td><input name="mem_trial" type="number" min="0" max="90" step="1" required defaultValue={pricing.membership.trial_days} style={{ maxWidth: 120 }} /></td>
                <td></td>
              </tr>
            </tbody>
          </table>
          <p className="muted small" style={{ marginBottom: 0 }}>
            At these prices, paying yearly saves &pound;{save.pounds}
            {save.months > 0 && <> ({save.months === 1 ? '1 month' : `${save.months} months`} free)</>}, about &pound;{save.perMonth.toFixed(2).replace(/\.00$/, '')} a month.
            The plan screen members see works this out for itself.
          </p>
        </div>

        <p className="muted small">
          Founding members stay free whichever way you charge. Discount codes work with both.
          Members who joined on turnover pricing ({legacy} paying now) keep every tool, including Pro ones, if you switch to plans.
        </p>
        <button type="submit" className="primary">Save prices</button>
      </form>

      <h2 style={{ marginTop: 32 }}>Supplier plans</h2>
      <p className="muted">
        Suppliers pay yearly through Stripe, in whole pounds excluding VAT. A change applies to new payments straight away; suppliers who have
        already paid keep their price until you tell them otherwise. Discount codes work for suppliers too.
      </p>
      <form method="post" action="/api/admin/supplier-prices" style={{ maxWidth: 640 }}>
        <div className="panel">
          <table className="table">
            <thead><tr><th>Plan</th><th>Price a year (£)</th><th>Paying suppliers</th></tr></thead>
            <tbody>
              {SUPPLIER_TIERS.map((k) => (
                <tr key={k}>
                  <td><strong>{TIER_INFO[k].label}</strong><br /><span className="muted small">{TIER_INFO[k].tagline}</span></td>
                  <td><input name={`supplier_${k}`} type="number" min="1" step="1" required defaultValue={supplierPrices[k]} style={{ maxWidth: 120 }} /></td>
                  <td>{supCount(k)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="submit" className="primary">Save supplier prices</button>
      </form>
    </div>
  );
}
