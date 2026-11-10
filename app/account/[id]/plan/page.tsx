import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ownedBusiness } from '@/lib/account';
import { isPaid, planChosen } from '@/lib/membership';
import JoinSteps from '@/app/join/JoinSteps';
import PlanCards from '@/app/PlanCards';
import { stripeEnabled } from '@/lib/stripe';
import { getPricing, yearlySaving } from '@/lib/pricing';
import '../../../plans.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Choose how you are listed | TLGB' };

/** After approval: free listing, or verified membership paid monthly or yearly with a free trial. */
export default async function PlanPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ billing?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const own = await ownedBusiness(id);
  if (!own.ok) {
    if (own.status === 401) redirect(`/login?next=/account/${id}/plan`);
    notFound();
  }
  const b = own.business;
  const pricing = await getPricing();
  const started = b.status === 'started';
  if (started && planChosen(b)) redirect(`/account/${b.id}/details`);
  if (pricing.mode !== 'membership' || !(b.status === 'approved' || started) || isPaid(b)) redirect(`/account/${b.id}`);

  const m = pricing.membership;
  const save = yearlySaving(pricing);
  const trial = m.trial_days > 0 && !b.stripe_subscription_id ? m.trial_days : 0;
  const first = (b.contact_name ?? '').split(' ')[0];
  const live = stripeEnabled();

  return (
    <div className="plans-page">
      {started && <JoinSteps on="plan" />}
      <h1>{first ? `Welcome, ${first}. ` : ''}How do you want {b.trading_name} to be listed?</h1>
      <p className="muted">
        {trial ? <>Both verified options start with <strong>{trial} days free</strong>. Nothing to pay today. </> : null}
        You can change this at any time.
        {started && ' Next, add your details in your own time.'}
      </p>
      {sp.billing && <p className="err big">{sp.billing}</p>}

      <PlanCards monthly={m.monthly} yearly={m.yearly} trial={trial} save={save} live={live} target={{ businessId: b.id, onFree: !!b.free_listing }} />

      <p className="muted small">
        Secure card payment through Stripe.{trial ? ` We email you before your free trial ends, and you can cancel before then and pay nothing.` : ''}
        {' '}Prices exclude VAT. We are not VAT registered, so no VAT is charged at present.
        {!live && ' Online payment is not switched on yet; email admin@tlgb.co.uk to join.'}
      </p>
      {!started && <p className="small"><Link href={`/account/${b.id}`}>Back to my listing</Link></p>}
    </div>
  );
}
