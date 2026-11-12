import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/session';
import { ownedSupplier, isSubscribed } from '@/lib/supplierAccount';
import { stripe, stripeEnabled } from '@/lib/stripe';
import { getSupplierPricing, TIER_INFO } from '@/lib/supplierPricing';
import { db } from '@/lib/supabase';
import { emailAdminSupplier } from '@/lib/email';

export const runtime = 'nodejs';

const back = (req: NextRequest, id: string, q: string) => NextResponse.redirect(new URL(`/supplier/${id}?${q}`, req.url), 303);
const fail = (req: NextRequest, id: string, msg: string) => back(req, id, 'billing=' + encodeURIComponent(msg));

/**
 * Appear to Match on the existing yearly subscription. Stripe charges the card on file now for the
 * difference over the rest of the year (pro rata), and the new full price applies from the next renewal.
 */
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const id = String(fd?.get('supplier_id') ?? '');
  if (!sameOrigin(req)) return NextResponse.redirect(new URL('/account', req.url), 303);
  const own = await ownedSupplier(id);
  if (!own.ok) return NextResponse.redirect(new URL('/login?next=/account', req.url), 303);
  const s = own.supplier;
  if (fd?.get('confirm') !== 'yes') return fail(req, id, 'Tick the box to confirm the upgrade.');
  if (!stripeEnabled()) return fail(req, id, 'Online payment is not switched on yet. We will be in touch.');
  if (!isSubscribed(s) || !s.stripe_subscription_id) return fail(req, id, 'Pick and pay for a plan first.');
  if (s.tier === 'match') return fail(req, id, 'You are already on Match.');
  const pricing = await getSupplierPricing();
  try {
    const sub = await stripe('GET', `subscriptions/${s.stripe_subscription_id}`);
    if (!['active', 'trialing'].includes(sub.status)) return fail(req, id, 'Your plan is not active, so it cannot be upgraded. Use Manage billing.');
    if (sub.cancel_at_period_end) return fail(req, id, 'Your plan is set to end. Use Manage billing to keep it, then upgrade.');
    const item = sub.items?.data?.[0];
    if (!item) return fail(req, id, 'We could not find your plan on Stripe. Email admin@tlgb.co.uk.');
    const product = await stripe('POST', 'products', { name: `The Little Green Book supplier plan: ${TIER_INFO.match.label} (yearly)`, metadata: { supplier_id: s.id } });
    const tax = process.env.STRIPE_AUTOMATIC_TAX === '1';
    await stripe('POST', `subscriptions/${sub.id}`, {
      items: [{
        id: item.id,
        price_data: {
          currency: 'gbp',
          unit_amount: pricing.match * 100,
          recurring: { interval: 'year' },
          product: product.id,
          ...(tax ? { tax_behavior: 'exclusive' } : {}),
        },
      }],
      proration_behavior: 'always_invoice',
      payment_behavior: 'error_if_incomplete',
      metadata: { ...(sub.metadata ?? {}), supplier_id: s.id, tier: 'match', interval: 'year' },
    });
  } catch (err) {
    console.error('supplier upgrade failed', err);
    return fail(req, id, 'The upgrade did not go through, so nothing has changed. Check your card on Manage billing, or email admin@tlgb.co.uk.');
  }
  // The Stripe webhook will also set this; doing it here means the page is right straight away.
  const quote = s.quote_plan === 'founding' ? {} : { quote_requests: true, quote_plan: 'paid', quote_paid_until: s.paid_until ? s.paid_until.slice(0, 10) : null };
  await db().from('suppliers').update({ tier: 'match', ...quote }).eq('id', s.id);
  await emailAdminSupplier(`Supplier upgraded to Match: ${s.name}`, `${s.name} has upgraded from Appear to Match.`, s.id).catch(() => null);
  return back(req, id, 'upgraded=1');
}
