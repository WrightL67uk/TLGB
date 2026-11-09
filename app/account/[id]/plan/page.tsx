import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ownedBusiness } from '@/lib/account';
import { isPaid } from '@/lib/membership';
import { stripeEnabled } from '@/lib/stripe';
import { getPricing, yearlySaving } from '@/lib/pricing';
import '../../../plans.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Choose how you are listed | TLGB' };

const pounds = (n: number) => `£${Number.isInteger(n) ? n : n.toFixed(2)}`;

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
  if (pricing.mode !== 'membership' || b.status !== 'approved' || isPaid(b)) redirect(`/account/${b.id}`);

  const m = pricing.membership;
  const save = yearlySaving(pricing);
  const trial = m.trial_days > 0 && !b.stripe_subscription_id ? m.trial_days : 0;
  const first = (b.contact_name ?? '').split(' ')[0];
  const live = stripeEnabled();

  return (
    <div className="plans-page">
      <h1>{first ? `Welcome, ${first}. ` : ''}How do you want {b.trading_name} to be listed?</h1>
      <p className="muted">
        {trial ? <>Both verified options start with <strong>{trial} days free</strong>. Nothing to pay today. </> : null}
        You can change this at any time.
      </p>
      {sp.billing && <p className="err big">{sp.billing}</p>}

      <div className="plans">
        <section className="plan plan-free">
          <h2>Free listing</h2>
          <p className="plan-price">£0</p>
          <p className="muted small">Shown as unverified</p>
          <ul>
            <li className="yes">Basic listing in search</li>
            <li className="yes">Read the help board</li>
            <li className="no">Verified badge</li>
            <li className="no">Leads and contractor jobs</li>
            <li className="no">Member tools</li>
          </ul>
          <form method="post" action="/api/billing/free">
            <input type="hidden" name="business_id" value={b.id} />
            <button type="submit">{b.free_listing ? 'Stay on free' : 'Continue free'}</button>
          </form>
        </section>

        <section className="plan plan-mid">
          {trial > 0 && <span className="plan-badge">{trial} days free</span>}
          <h2>Verified monthly</h2>
          <p className="plan-price">{pounds(m.monthly)} <span>a month</span></p>
          <p className="muted small">Cancel any time</p>
          <ul>
            <li className="yes">Verified badge, shown first</li>
            <li className="yes">Every lead and contractor job</li>
            <li className="yes">Compliance pack, PQQ bank</li>
            <li className="yes">Price requests, free website</li>
            <li className="yes">Payment tracker, team records</li>
          </ul>
          <form method="post" action="/api/billing/checkout">
            <input type="hidden" name="business_id" value={b.id} />
            <input type="hidden" name="interval" value="month" />
            <button type="submit" className="plan-go" disabled={!live}>{trial ? 'Start free trial' : 'Pay monthly'}</button>
          </form>
        </section>

        <section className="plan plan-best">
          <span className="plan-badge">Best value</span>
          {save.months > 0 && <span className="plan-badge">{save.months === 1 ? '1 month' : `${save.months} months`} free</span>}
          {trial > 0 && save.months === 0 && <span className="plan-badge">{trial} days free</span>}
          <h2>Verified yearly</h2>
          <p className="plan-price plan-price-big">{pounds(m.yearly)} <span>a year</span></p>
          {save.pounds > 0 && <p className="plan-save">Works out at {pounds(save.perMonth)} a month. Save {pounds(save.pounds)}.</p>}
          <ul>
            <li className="yes">Everything in monthly</li>
            <li className="yes">Verified badge, shown first</li>
            <li className="yes">Every lead and contractor job</li>
            <li className="yes">Compliance pack, PQQ bank</li>
            <li className="yes">Price requests, free website</li>
            <li className="yes">One payment, sorted for the year</li>
          </ul>
          <form method="post" action="/api/billing/checkout">
            <input type="hidden" name="business_id" value={b.id} />
            <input type="hidden" name="interval" value="year" />
            <button type="submit" className="plan-go plan-go-big" disabled={!live}>{trial ? 'Start free trial' : 'Pay yearly'}</button>
          </form>
        </section>
      </div>

      <p className="muted small">
        Secure card payment through Stripe.{trial ? ` We email you before your free trial ends, and you can cancel before then and pay nothing.` : ''}
        {!live && ' Online payment is not switched on yet; email admin@tlgb.co.uk to join.'}
      </p>
      <p className="small"><Link href={`/account/${b.id}`}>Back to my listing</Link></p>
    </div>
  );
}
