import Link from 'next/link';
import { cookies } from 'next/headers';
import SupplierSignup from './SupplierSignup';
import { CODE_COOKIE, describe, findCode, usable } from '@/lib/discounts';
import { getSupplierPricing, tierKey, TIER_INFO, SUPPLIER_TIERS } from '@/lib/supplierPricing';
import { stripeEnabled } from '@/lib/stripe';
import '../../plans.css';

export const metadata = { title: 'Supplier plans | The Little Green Book', description: 'Be found by landscaping contractors, and be matched to their price requests. Yearly plans for suppliers.' };
export const dynamic = 'force-dynamic';

const pounds = (n: number) => `£${n.toLocaleString('en-GB')}`;
const STEPS = ['Choose your plan', 'Your account', 'Payment', 'Your details', 'Send for approval'];
const Steps = ({ on }: { on: number }) => (
  <ol className="join-steps" aria-label="Sign-up steps">{STEPS.map((s, i) => <li key={s} className={i === on ? 'on' : ''}>{i + 1}. {s}</li>)}</ol>
);

/** Supplier sign-up: choose Appear or Match, then the account, then Stripe, then the rest of the details. */
export default async function SupplierJoin({ searchParams }: { searchParams: Promise<{ code?: string; plan?: string }> }) {
  const sp = await searchParams;
  const raw = sp.code || (await cookies()).get(CODE_COOKIE)?.value;
  const found = raw ? await findCode(raw).catch(() => null) : null;
  const offer = found && usable(found.code, found.uses) ? found.code : null;
  const prices = await getSupplierPricing();
  const live = stripeEnabled();
  const tier = tierKey(sp.plan);
  const offerBox = offer && <p className="ok-box">Code <strong>{offer.code}</strong>: {describe(offer)}. It will be taken off when you pay.</p>;

  if (!tier) {
    return (
      <div className="plans-page">
        <Steps on={0} />
        <h1>Put your supply business in front of the trade</h1>
        <p className="muted">
          Landscaping contractors use The Little Green Book to find suppliers and to ask several of them for prices at once.
          Choose how you want to be found. Both plans are paid yearly.
        </p>
        {offerBox}
        <div className="plans" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', alignItems: 'stretch' }}>
          {SUPPLIER_TIERS.map((k) => (
            <section key={k} className={`plan ${k === 'match' ? 'plan-best' : 'plan-mid'}`}>
              {k === 'match' && <span className="plan-badge">Most orders</span>}
              <h2>{TIER_INFO[k].label}</h2>
              <p className="muted small" style={{ margin: '2px 0 0' }}>{TIER_INFO[k].tagline}</p>
              <p className={`plan-price ${k === 'match' ? 'plan-price-big' : ''}`}>{pounds(prices[k])} <span>a year + VAT if applicable</span></p>
              <ul>{TIER_INFO[k].features.map((f) => <li key={f} className="yes">{f}</li>)}</ul>
              {live
                ? <Link href={`/suppliers/join?plan=${k}`} className={`plan-btn plan-go ${k === 'match' ? 'plan-go-big' : ''}`}>Choose {TIER_INFO[k].label}</Link>
                : <p className="muted small">Online payment is not switched on yet. Email admin@tlgb.co.uk to join.</p>}
            </section>
          ))}
        </div>
        <p className="muted small">
          No insurance certificates or accreditations are needed to join. We check your company details, then your profile, before it goes live.
          Secure card payment through Stripe. Prices exclude VAT. We are not VAT registered, so no VAT is charged at present.
        </p>
        <p className="small">Already signed up? <Link href="/login">Log in</Link>. Looking for a trade listing? <Link href="/join">Join as a trade</Link>.</p>
      </div>
    );
  }

  return (
    <div className="narrow">
      <Steps on={1} />
      <h1>Set up your supplier account</h1>
      <div className="plan-pick">
        <span>Your plan: <strong>{TIER_INFO[tier].label}, {pounds(prices[tier])} a year</strong></span>
        <Link href="/suppliers/join" className="small">change</Link>
      </div>
      {offerBox}
      <SupplierSignup tier={tier} />
    </div>
  );
}
