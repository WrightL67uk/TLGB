import 'server-only';
import { db } from '@/lib/supabase';
import { stripe } from '@/lib/stripe';
import { siteUrl } from '@/lib/config';
import { findCode, usable } from '@/lib/discounts';
import { TIER_INFO, type SupplierPricing, type SupplierTier } from '@/lib/supplierPricing';
import type { Supplier } from '@/lib/supplierAccount';

/** Opens Stripe's payment page for a supplier's yearly plan and returns its address, or an error message for them. */
export async function openSupplierCheckout(s: Supplier, pricing: SupplierPricing, tier: SupplierTier): Promise<{ url: string } | { error: string }> {
  const price = pricing[tier];
  let customer = s.stripe_customer_id;
  if (!customer) {
    const c = await stripe('POST', 'customers', { email: s.email, name: s.name, metadata: { supplier_id: s.id } });
    customer = c.id as string;
    await db().from('suppliers').update({ stripe_customer_id: customer }).eq('id', s.id);
  }
  const meta = { supplier_id: s.id, tier, interval: 'year' };
  const tax = process.env.STRIPE_AUTOMATIC_TAX === '1';
  // A code from a shared link is applied for them. Otherwise they can type one on Stripe's page.
  const fromLink = s.signup_code ? await findCode(s.signup_code) : null;
  const promo = fromLink && usable(fromLink.code, fromLink.uses) ? fromLink.code.stripe_promo_id : null;
  const params = {
    mode: 'subscription',
    payment_method_collection: 'if_required', // a 100% code means no card is asked for
    customer,
    client_reference_id: s.id,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'gbp',
        unit_amount: price * 100,
        recurring: { interval: 'year' },
        product_data: { name: `The Little Green Book supplier plan: ${TIER_INFO[tier].label} (yearly)` },
        ...(tax ? { tax_behavior: 'exclusive' } : {}),
      },
    }],
    subscription_data: { metadata: meta },
    metadata: meta,
    ...(promo ? { discounts: [{ promotion_code: promo }] } : { allow_promotion_codes: 'true' }),
    billing_address_collection: 'auto',
    customer_update: { address: 'auto', name: 'auto' },
    ...(tax ? { automatic_tax: { enabled: 'true' }, tax_id_collection: { enabled: 'true' } } : {}),
    success_url: `${siteUrl()}/supplier/${s.id}${s.status === 'started' ? '/details' : ''}?paid=1`,
    cancel_url: `${siteUrl()}/supplier/${s.id}`,
  };
  let session;
  try {
    session = await stripe('POST', 'checkout/sessions', params);
  } catch (e) {
    if (!promo) throw e;
    console.warn('supplier checkout with code failed, retrying without', e);
    const { discounts: _drop, ...rest } = params as Record<string, unknown>; // eslint-disable-line @typescript-eslint/no-unused-vars
    session = await stripe('POST', 'checkout/sessions', { ...rest, allow_promotion_codes: 'true' });
  }
  return { url: session.url as string };
}
