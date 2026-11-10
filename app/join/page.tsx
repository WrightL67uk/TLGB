import Link from 'next/link';
import { cookies } from 'next/headers';
import QuickStart from './QuickStart';
import JoinSteps from './JoinSteps';
import PlanCards from '@/app/PlanCards';
import { CODE_COOKIE, describe, findCode, usable } from '@/lib/discounts';
import { getPricing, bandsWithPrices, yearlySaving } from '@/lib/pricing';
import { stripeEnabled } from '@/lib/stripe';
import '../plans.css';

export const metadata = { title: 'List your business | TLGB' };
export const dynamic = 'force-dynamic';

const pounds = (n: number) => `£${Number.isInteger(n) ? n : n.toFixed(2)}`;
type Plan = 'free' | 'month' | 'year';

/** Sign-up: choose a plan first, then the account details, then payment (paid plans), then the rest. */
export default async function JoinPage({ searchParams }: { searchParams: Promise<{ code?: string; plan?: string }> }) {
  const sp = await searchParams;
  const raw = sp.code || (await cookies()).get(CODE_COOKIE)?.value;
  const found = raw ? await findCode(raw).catch(() => null) : null;
  const offer = found && usable(found.code, found.uses) ? found.code : null;
  const pricing = await getPricing();
  const bands = bandsWithPrices(pricing).map(({ key, label }) => ({ key, label }));
  const membership = pricing.mode === 'membership';
  const m = pricing.membership;
  const live = stripeEnabled();
  const plan: Plan | null = sp.plan === 'free' || sp.plan === 'month' || sp.plan === 'year' ? sp.plan : null;

  const offerBox = offer && (
    <p className="ok-box">Code <strong>{offer.code}</strong>: {describe(offer)}. It will be taken off when you pay.</p>
  );

  // Other pricing options keep the old order: account first, then details.
  if (!membership) {
    return (
      <div className="narrow">
        <JoinSteps on="account" free />
        <h1>List your business</h1>
        <p className="lead">Takes two minutes to start. Every business is checked by hand before it goes live, so contractors know who they are dealing with.</p>
        {offerBox}
        <QuickStart bands={bands} plan={null} priceLine="Next you add your details in your own time and send them to us to check." />
      </div>
    );
  }

  // Step 1: choose a plan
  if (!plan || (plan !== 'free' && !live)) {
    return (
      <div className="plans-page">
        <JoinSteps on="plan" />
        <h1>List your business on The Little Green Book</h1>
        <p className="muted">
          Choose how you want to be listed.{m.trial_days ? <> Both verified options start with <strong>{m.trial_days} days free</strong>, with nothing to pay today.</> : null}{' '}
          Every business is checked by hand before it goes live, free or paid.
        </p>
        {offerBox}
        <PlanCards monthly={m.monthly} yearly={m.yearly} trial={m.trial_days} save={yearlySaving(pricing)} live={live} target={{ join: true }} />
        <p className="muted small">
          Secure card payment through Stripe.{m.trial_days ? ' We email you before your free trial ends, and you can cancel before then and pay nothing.' : ''}
          {' '}Prices exclude VAT. We are not VAT registered, so no VAT is charged at present.
          {!live && ' Online payment is not switched on yet, so only the free listing can be chosen for now.'}
        </p>
        <p className="small">Already signed up? <Link href="/login">Log in</Link></p>
      </div>
    );
  }

  // Step 2: the account
  const free = plan === 'free';
  const chosen = free
    ? 'Free listing, shown as unverified'
    : `Verified ${plan === 'month' ? `monthly, ${pounds(m.monthly)} a month` : `yearly, ${pounds(m.yearly)} a year`}${m.trial_days ? `, first ${m.trial_days} days free` : ''}`;
  const priceLine = free
    ? 'Next you add your details in your own time and send them to us to check.'
    : `Next you go to Stripe to add your card${m.trial_days ? `. Nothing is taken until your ${m.trial_days} free days are up` : ''}. Then you add your details in your own time.`;

  return (
    <div className="narrow">
      <JoinSteps on="account" free={free} />
      <h1>Set up your account</h1>
      <div className="plan-pick">
        <span>Your plan: <strong>{chosen}</strong></span>
        <Link href="/join" className="small">change</Link>
      </div>
      {offerBox}
      <QuickStart bands={bands} plan={plan} priceLine={priceLine} />
    </div>
  );
}
