import 'server-only';
import { stripe, stripeEnabled } from './stripe';
import { siteUrl } from './config';
import { db } from './supabase';
import { getAgencyPlan, type Agency } from './agencies';

export const agencyPaid = (status: string) => ['active', 'trialing', 'past_due'].includes(status);

/** Opens Stripe Checkout for the agency's annual plan and returns the payment page address (or null if payments are off). */
export async function agencyCheckoutUrl(a: Pick<Agency, 'id' | 'name' | 'email' | 'stripe_customer_id'>, cancelPath: string): Promise<string | null> {
  if (!stripeEnabled()) return null;
  const plan = await getAgencyPlan();
  let customer = a.stripe_customer_id;
  if (!customer) {
    const c = await stripe('POST', 'customers', { email: a.email, name: a.name, metadata: { agency_id: a.id } });
    customer = c.id as string;
    await db().from('agencies').update({ stripe_customer_id: customer }).eq('id', a.id);
  }
  const meta = { agency_id: a.id, credits: String(plan.credits) };
  const tax = process.env.STRIPE_AUTOMATIC_TAX === '1';
  const session = await stripe('POST', 'checkout/sessions', {
    mode: 'subscription',
    customer,
    client_reference_id: a.id,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'gbp',
        unit_amount: plan.price * 100,
        recurring: { interval: 'year' },
        product_data: { name: `The Little Green Book recruitment agency plan (1 year, ${plan.credits} vacancy credits)` },
        ...(tax ? { tax_behavior: 'exclusive' } : {}),
      },
    }],
    subscription_data: { metadata: meta },
    metadata: meta,
    allow_promotion_codes: 'true',
    billing_address_collection: 'auto',
    customer_update: { address: 'auto', name: 'auto' },
    ...(tax ? { automatic_tax: { enabled: 'true' }, tax_id_collection: { enabled: 'true' } } : {}),
    success_url: `${siteUrl()}/agencies/join/thanks?paid=1`,
    cancel_url: `${siteUrl()}${cancelPath}`,
  });
  return session.url as string;
}

/** Rejected agency: cancel the plan, refund the latest payment and take back the credits. Returns a note for admin. */
export async function refundAgency(a: { id: string; stripe_subscription_id: string | null }): Promise<string> {
  if (!a.stripe_subscription_id || !stripeEnabled()) return 'No payment to refund.';
  try {
    const invoices = await stripe('GET', 'invoices', { subscription: a.stripe_subscription_id, limit: 1 });
    const inv = invoices?.data?.[0];
    await stripe('DELETE', `subscriptions/${a.stripe_subscription_id}`).catch(() => null);
    const pi = inv?.payment_intent as string | undefined;
    const ch = inv?.charge as string | undefined;
    if (!pi && !ch) return 'Plan cancelled. Could not find the payment to refund, so refund it in Stripe.';
    await stripe('POST', 'refunds', pi ? { payment_intent: pi } : { charge: ch });
    return 'Plan cancelled and payment refunded.';
  } catch (e) {
    console.error('agency refund failed', e);
    return 'Plan cancel or refund failed. Please refund it in Stripe.';
  }
}
