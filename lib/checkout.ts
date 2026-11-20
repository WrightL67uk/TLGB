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
  const meta: Record<string, string> = { business_id: b.id, interval: item.interval, ...(item.plan ? { plan: item.plan } : {}) };
  const tax = process.env.STRIPE_AUTOMATIC_TAX === '1';
  // A code from a shared link is applied for them. Otherwise they can type one on Stripe's page.
  // Stripe does not allow both at once.
  const fromLink = b.signup_code ? await findCode(b.signup_code) : null;
  const live = fromLink && usable(fromLink.code, fromLink.uses) ? fromLink.code : null;
  const promo = live && live.kind !== 'price' ? live.stripe_promo_id : null;
  // A code that sets the monthly price (for example £25 a month for life). Monthly membership only.
  const fixed = live && live.kind === 'price' && pricing.mode === 'membership' && item.interval === 'month' && Number(live.value) < item.price ? live : null;
  let fixedCoupon: string | null = null;
  if (fixed && fixed.duration === 'forever') {
    item.price = Number(fixed.value); // the membership itself is set up at this price, so it stays when our prices change
  } else if (fixed) {
    // For a number of payments: money off for that long, then back to the price at the time they joined.
    // Stripe counts the months from the day the trial starts, so the trial is added on.
    const months = (fixed.duration_months ?? 3) + (trial > 0 ? Math.ceil(trial / 30) : 0);
    const made = await stripe('POST', 'coupons', {
      name: `${fixed.code}: £${Number(fixed.value)} a month`.slice(0, 40),
      amount_off: Math.round((item.price - Number(fixed.value)) * 100), currency: 'gbp',
      duration: 'repeating', duration_in_months: months,
      metadata: { tlgb_code_id: fixed.id, business_id: b.id },
    });
    fixedCoupon = made.id as string;
  }
  if (fixed) Object.assign(meta, { tlgb_code_id: fixed.id });
  const params = {
    mode: 'subscription',
    // Always take a card, so the free trial can turn into a paid membership. With 'if_required' Stripe
    // skips the card whenever nothing is due today, which is every trial. Only a 100% code skips it.
    payment_method_collection: live && live.kind === 'percent' && Number(live.value) >= 100 ? 'if_required' : 'always',
    customer,
    client_reference_id: b.id,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'gbp',
        unit_amount: Math.round(item.price * 100),
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
    ...(fixedCoupon ? { discounts: [{ coupon: fixedCoupon }] } : fixed ? {} : promo ? { discounts: [{ promotion_code: promo }] } : { allow_promotion_codes: 'true' }),
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
    if (!promo || fixed) throw e;
    console.warn('checkout with code failed, retrying without', e);
    const { discounts: _drop, ...rest } = params as Record<string, unknown>; // eslint-disable-line @typescript-eslint/no-unused-vars
    session = await stripe('POST', 'checkout/sessions', { ...rest, allow_promotion_codes: 'true' });
  }
  return { url: session.url as string };
}
