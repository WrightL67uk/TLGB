import Link from 'next/link';
import { cookies } from 'next/headers';
import SupplierSignup from './SupplierSignup';
import PromoVideo from '@/app/PromoVideo';
import { CODE_COOKIE, describe, findCode, usable } from '@/lib/discounts';
import { getSupplierPricing, tierKey, TIER_INFO, SUPPLIER_TIERS, BASIC_INFO } from '@/lib/supplierPricing';
import { stripeEnabled } from '@/lib/stripe';
import '../../plans.css';

export const metadata = { title: 'Supplier plans | The Little Green Book', description: 'Be found by landscaping contractors, and be matched to their estimate requests. Yearly plans for suppliers.' };
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
  const offer = found && usable(found.code, found.uses) && found.code.kind !== 'price' ? found.code : null;
  const prices = await getSupplierPricing();
  const live = stripeEnabled();
  const tier = sp.plan === 'basic' ? 'basic' as const : tierKey(sp.plan);
  const offerBox = offer && <p className="ok-box">Code <strong>{offer.code}</strong>: {describe(offer)}. It will be taken off when you pay.</p>;

  if (!tier) {
    return (
      <div className="plans-page">
        <Steps on={0} />
        <h1>Put your supply business in front of the trade</h1>
        <p className="muted">
          Landscaping contractors use The Little Green Book to find suppliers and to ask several of them for prices at once.
          Choose how you want to be found. Start with a free Basic listing, or pick a paid plan (paid yearly) for a full profile and more enquiries.
        </p>
        <PromoVideo name="tlgb-suppliers" label="What a supplier plan gets you, in 50 seconds." />
        {offerBox}
        <div className="plans sup-plans" style={{ alignItems: 'stretch' }}>
          <section className="plan">
            <h2>{BASIC_INFO.label}</h2>
            <p className="muted small" style={{ margin: '2px 0 0' }}>{BASIC_INFO.tagline}</p>
            <p className="plan-price">Free</p>
            <ul>
              {BASIC_INFO.features.map((f) => <li key={f} className="yes">{f}</li>)}
              {BASIC_INFO.missing.map((f) => <li key={f} className="no">{f}</li>)}
            </ul>
            <Link href="/suppliers/join?plan=basic" className="plan-btn">Choose Basic</Link>
          </section>
          {SUPPLIER_TIERS.map((k) => (
            <section key={k} className={`plan ${k === 'match' ? 'plan-best' : 'plan-mid'}`}>
              {k === 'match' && <span className="plan-badge">Most orders</span>}
              <h2>{TIER_INFO[k].label}</h2>
              <p className="muted small" style={{ margin: '2px 0 0' }}>{TIER_INFO[k].tagline}</p>
              <p className={`plan-price ${k === 'match' ? 'plan-price-big' : ''}`}>{pounds(prices[k])} <span>a year</span></p>
              <ul>{TIER_INFO[k].features.map((f) => <li key={f} className="yes">{f}</li>)}</ul>
              {live
                ? <Link href={`/suppliers/join?plan=${k}`} className={`plan-btn plan-go ${k === 'match' ? 'plan-go-big' : ''}`}>Choose {TIER_INFO[k].label}</Link>
                : <p className="muted small">Online payment is not switched on yet. Email admin@tlgb.co.uk to join.</p>}
            </section>
          ))}
        </div>
        <p className="muted small">
          No insurance certificates or accreditations are needed to join. We check your company details, then your profile, before it goes live.
          Secure card payment through Stripe. We are not VAT registered, so there is no VAT to pay on top of these prices. If that changes we will give you at least 30 days&rsquo; notice.
        </p>
        {!offer && (
          <form method="get" action="/suppliers/join" style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap', margin: '10px 0' }}>
            <label className="small">Have a code?
              <input name="code" maxLength={20} pattern="[A-Za-z0-9]{3,20}" style={{ textTransform: 'uppercase', width: 180 }} />
            </label>
            <button type="submit">Use code</button>
          </form>
        )}
        {sp.code && !offer && <p className="err">That code cannot be used on a supplier plan. Check it and try again.</p>}
        <p className="small">Already signed up? <Link href="/login">Log in</Link>. Looking for a trade listing? <Link href="/join">Join as a trade</Link>.</p>
      </div>
    );
  }

  return (
    <div className="narrow">
      <Steps on={1} />
      <h1>Set up your supplier account</h1>
      <div className="plan-pick">
        <span>Your plan: <strong>{tier === 'basic' ? 'Basic, free' : `${TIER_INFO[tier].label}, ${pounds(prices[tier])} a year`}</strong></span>
        <Link href="/suppliers/join" className="small">change</Link>
      </div>
      {offerBox}
      <SupplierSignup tier={tier} />
      <p className="muted small">Questions before you sign up? <Link href="/contact?who=supplier">Contact us</Link>.</p>
    </div>
  );
}
