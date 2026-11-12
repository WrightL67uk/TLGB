import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ownedSupplier, isSubscribed, hasProfile } from '@/lib/supplierAccount';
import { getSupplierPricing, TIER_INFO, SUPPLIER_TIERS } from '@/lib/supplierPricing';
import { stripeEnabled } from '@/lib/stripe';
import '../../resources.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My supplier account | TLGB' };

const pounds = (n: number) => `£${n.toLocaleString('en-GB')}`;
const STATUS: Record<string, string> = { started: 'Details not sent yet', pending: 'Waiting for approval', approved: 'Live', rejected: 'Not approved' };

export default async function SupplierAccount({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ paid?: string; billing?: string; sent?: string; upgraded?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const own = await ownedSupplier(id);
  if (!own.ok) {
    if (own.status === 401) redirect(`/login?next=/supplier/${id}`);
    notFound();
  }
  const s = own.supplier;
  const prices = await getSupplierPricing();
  const subscribed = isSubscribed(s);
  const tier = s.tier ?? 'appear';
  const daysLeft = s.paid_until ? Math.max(0, Math.ceil((new Date(s.paid_until).getTime() - Date.now()) / 86_400_000)) : 365;
  const upgradeToday = Math.round(Math.max(0, prices.match - prices.appear) * Math.min(1, daysLeft / 365));
  const renews = s.paid_until ? new Date(s.paid_until).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  return (
    <div className="narrow">
      <div className="account-head">
        <h1>{s.name}</h1>
        <form action="/api/auth/logout" method="post"><button type="submit">Log out</button></form>
      </div>
      {sp.paid && <p className="ok-box"><strong>Payment received, thank you.</strong> {s.status === 'started' ? 'Next, add your details.' : ''}</p>}
      {sp.upgraded && <p className="ok-box"><strong>You are now on Match.</strong> You will be matched to members&rsquo; estimate requests for what you supply.</p>}
      {sp.sent && <p className="ok-box"><strong>Sent for checking.</strong> We usually approve within a working day and will email you when you are live.</p>}
      {sp.billing && <p className="err big">{sp.billing}</p>}
      {s.status === 'rejected' && <p className="err big">This application was not approved{s.rejection_reason ? `: ${s.rejection_reason}` : '.'} Email admin@tlgb.co.uk if you would like to talk it through.</p>}

      <div className="panel">
        <strong>Status: {STATUS[s.status] ?? s.status}</strong>
        {s.status === 'started' && <p style={{ margin: '6px 0 0' }}><Link href={`/supplier/${s.id}/details`} className="sq sq-rust">{subscribed ? 'Add your details' : 'Continue'}</Link></p>}
        {s.status === 'pending' && <p className="muted small" style={{ margin: '6px 0 0' }}>You can still update your details while we check them.</p>}
        {s.status === 'approved' && hasProfile(s) && <p style={{ margin: '6px 0 0' }}><Link href={`/suppliers/${s.slug}`}>View your public company profile</Link></p>}
        {s.status === 'approved' && !subscribed && !!s.tier && <p className="err" style={{ margin: '6px 0 0' }}>Your plan has ended, so you no longer show in the supplier list. Choose a plan below to come back.</p>}
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Your plan</h2>
        {subscribed ? (
          <>
            <p><strong>{TIER_INFO[tier].label}</strong>, {pounds(prices[tier])} a year. {renews ? <>Renews on {renews}.</> : null}</p>
            <ul style={{ margin: '0 0 10px 18px' }}>{TIER_INFO[tier].features.map((f) => <li key={f}>{f}</li>)}</ul>
            {tier === 'appear' && (
              <form method="post" action="/api/supplier/upgrade" className="panel" style={{ margin: '0 0 12px' }}>
                <input type="hidden" name="supplier_id" value={s.id} />
                <strong>Upgrade to Match, {pounds(prices.match)} a year</strong>
                <p className="muted small" style={{ margin: '4px 0 8px' }}>{TIER_INFO.match.tagline}. Everything in Appear, plus you are matched to members&rsquo; estimate requests for what you supply.</p>
                <label className="check" style={{ display: 'flex', gap: 8, fontWeight: 400 }}>
                  <input type="checkbox" name="confirm" value="yes" required />
                  <span>Charge my card on file about {pounds(upgradeToday)} now, the difference for the rest of this year{renews ? ` (to ${renews})` : ''}. From then it renews at {pounds(prices.match)} a year. No VAT is added.</span>
                </label>
                <button type="submit" className="primary" disabled={!stripeEnabled()}>Upgrade to Match</button>
              </form>
            )}
            <form method="post" action="/api/supplier/portal">
              <input type="hidden" name="supplier_id" value={s.id} />
              <button type="submit" disabled={!stripeEnabled() || !s.stripe_customer_id}>Manage billing</button>
              <span className="muted small"> Change card, download invoices or cancel.</span>
            </form>
          </>
        ) : (
          <>
            <p>Pick a plan to {s.status === 'started' ? 'finish joining' : 'come back'}. Plans are paid yearly through Stripe.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              {SUPPLIER_TIERS.map((k) => (
                <form key={k} method="post" action="/api/supplier/checkout" className="panel" style={{ margin: 0 }}>
                  <input type="hidden" name="supplier_id" value={s.id} />
                  <input type="hidden" name="tier" value={k} />
                  <strong>{TIER_INFO[k].label}</strong> <span className="muted">{pounds(prices[k])} a year</span>
                  <p className="muted small">{TIER_INFO[k].tagline}</p>
                  <button type="submit" className={s.tier === k ? 'primary' : ''} disabled={!stripeEnabled()}>Pay for {TIER_INFO[k].label}</button>
                </form>
              ))}
            </div>
            <p className="muted small">We are not VAT registered, so there is no VAT to pay on top of these prices. If that changes we will give you at least 30 days&rsquo; notice.</p>
          </>
        )}
      </div>

      {s.status !== 'rejected' && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Your profile</h2>
          <p><Link href={`/supplier/${s.id}/details`} className="sq">Edit details, logo and pictures</Link></p>
          <p className="muted small">Account email: {s.email}. {s.vat_registered ? `VAT registered (${s.vat_number}).` : 'Not VAT registered.'} {s.company_number ? `Company ${s.company_number}.` : ''}</p>
        </div>
      )}
    </div>
  );
}
