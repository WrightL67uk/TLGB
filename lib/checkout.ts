import 'server-only';
import { db } from '@/lib/supabase';
import { stripe } from '@/lib/stripe';
import { siteUrl } from '@/lib/config';
import { bandPrice, planKey, PLAN_INFO, type Interval, type Pricing } from '@/lib/pricing';
import { findCode, usable } from '@/lib/discounts';
import type { Business } from '@/lib/account';

/** Opens a Stripe payment page for this business and returns its address, or an error message for them. */
export async function openCheckout(b: Business, pricing: Pricing, choice: { interval?: unknown; plan?: unknown }): Promise<{ url: string } | { error: string }> {
  let item: { price: number; name: string; plan: string | null; interval: Interval; trialDays: number | null };
  if (pricing.mode === 'membership') {
    const interval: Interval = choice.interval === 'month' ? 'month' : 'year';
    item = {
      price: interval === 'month' ? pricing.membership.monthly : pricing.membership.yearly,
      name: `The Little Green Book verified membership (paid ${interval === 'month' ? 'monthly' : 'yearly'})`,
      plan: null,
      interval,
      // One free trial per business: not again for anyone who has paid before
      trialDays: pricing.membership.trial_days > 0 && !b.stripe_subscription_id ? pricing.membership.trial_days : null,
    };
  } else if (pricing.mode === 'plans') {
    const plan = planKey(choice.plan);
    item = { price: pricing.plans[plan], name: `The Little Green Book ${PLAN_INFO[plan].label} membership`, plan, interval: 'year', trialDays: null };
  } else {
    const band = bandPrice(pricing, b.turnover_band);
    if (!band) return { error: 'Choose your annual turnover below and save, then try again.' };
    item = { price: band.price, name: `The Little Green Book listing (${band.label} turnover)`, plan: null, interval: 'year', trialDays: null };
  }

  let customer = b.stripe_customer_id;
  if (!customer) {
    const c = await stripe('POST', 'customers', {
      email: b.email,
      name: b.trading_name,
      metadata: { business_id: b.id },
    });
    customer = c.id as string;
    await db().from('businesses').update({ stripe_customer_id: customer }).eq('id', b.id);
  }
  const trial = item.trialDays ?? Number(process.env.STRIPE_TRIAL_DAYS || 0);
  const meta = { business_id: b.id, interval: item.interval, ...(item.plan ? { plan: item.plan } : {}) };
  const tax = process.env.STRIPE_AUTOMATIC_TAX === '1';
  // A code from a shared link is applied for them. Otherwise they can type one on Stripe's page.
  // Stripe does not allow both at once.
  const fromLink = b.signup_code ? await findCode(b.signup_code) : null;
  const promo = fromLink && usable(fromLink.code, fromLink.uses) ? fromLink.code.stripe_promo_id : null;
  const params = {
    mode: 'subscription',
    customer,
    client_reference_id: b.id,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'gbp',
        unit_amount: item.price * 100,
        recurring: { interval: item.interval },
        product_data: { name: item.name },
        ...(tax ? { tax_behavior: 'exclusive' } : {}),
      },
    }],
    subscription_data: {
      metadata: meta,
      ...(trial > 0 ? { trial_period_days: trial } : {}),
    },
    metadata: meta,
    ...(promo ? { discounts: [{ promotion_code: promo }] } : { allow_promotion_codes: 'true' }),
    billing_address_collection: 'auto',
    customer_update: { address: 'auto', name: 'auto' },
    ...(tax ? { automatic_tax: { enabled: 'true' }, tax_id_collection: { enabled: 'true' } } : {}),
    success_url: `${siteUrl()}/account/${b.id}${b.status === 'started' ? '/details' : ''}?paid=1`,
    cancel_url: `${siteUrl()}/account/${b.id}${pricing.mode === 'membership' ? '/plan' : ''}`,
  };
  let session;
  try {
    session = await stripe('POST', 'checkout/sessions', params);
  } catch (e) {
    // If Stripe will not take the code (used up, ended), open the page without it so they can still pay.
    if (!promo) throw e;
    console.warn('checkout with code failed, retrying without', e);
    const { discounts: _drop, ...rest } = params as Record<string, unknown>; // eslint-disable-line @typescript-eslint/no-unused-vars
    session = await stripe('POST', 'checkout/sessions', { ...rest, allow_promotion_codes: 'true' });
  }
  return { url: session.url as string };
}
