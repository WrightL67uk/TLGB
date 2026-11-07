import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { ownedBusiness } from '@/lib/account';
import { isPaid } from '@/lib/membership';
import { stripe, stripeEnabled, mapStatus, periodEnd } from '@/lib/stripe';
import { MEMBER_PLANS, freeProUntil } from '@/lib/plans';

export const runtime = 'nodejs';

const back = (req: NextRequest, id: string, q: string) => NextResponse.redirect(new URL(`/account/${id}?${q}`, req.url), 303);

/**
 * Moves a paying Verified member onto Pro.
 * - Free Pro from a code still running: no charge now, the Pro price applies from their renewal.
 * - Otherwise: Pro starts now and Stripe charges the difference for the rest of the year.
 */
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const id = String(fd?.get('business_id') ?? '');
  if (!sameOrigin(req)) return NextResponse.redirect(new URL('/account', req.url), 303);
  const own = await ownedBusiness(id);
  if (!own.ok) return NextResponse.redirect(new URL(own.status === 401 ? '/login?next=/account' : '/account', req.url), 303);
  const b = own.business;

  if (!stripeEnabled() || !b.stripe_subscription_id || !isPaid(b) || b.founding_member) {
    return back(req, id, 'billing=' + encodeURIComponent('We could not upgrade this membership online. Email admin@tlgb.co.uk and we will sort it.'));
  }
  if (b.plan === 'pro') return back(req, id, 'billing=' + encodeURIComponent('You are already on Pro.'));

  try {
    const sub = await stripe('GET', `subscriptions/${b.stripe_subscription_id}`);
    const item = sub.items?.data?.[0];
    const product = typeof item?.price?.product === 'string' ? item.price.product : item?.price?.product?.id;
    if (!item || !product) throw new Error('subscription has no item');
    const atRenewal = !!freeProUntil(b);
    const tax = process.env.STRIPE_AUTOMATIC_TAX === '1';
    const updated = await stripe('POST', `subscriptions/${sub.id}`, {
      items: [{
        id: item.id,
        price_data: {
          currency: 'gbp',
          product,
          unit_amount: MEMBER_PLANS.pro.price * 100,
          recurring: { interval: 'year' },
          ...(tax ? { tax_behavior: 'exclusive' } : {}),
        },
      }],
      proration_behavior: atRenewal ? 'none' : 'always_invoice',
      metadata: { ...(sub.metadata ?? {}), plan: 'pro' },
    });
    await db().from('businesses').update({ plan: 'pro', subscription_status: mapStatus(updated.status), paid_until: periodEnd(updated) }).eq('id', b.id);
    await db().from('review_events').insert({ business_id: b.id, action: 'billing', actor: 'member', detail: atRenewal ? 'Upgraded to Pro from renewal' : 'Upgraded to Pro' });
    return back(req, id, 'billing=' + encodeURIComponent(atRenewal
      ? 'Done. You keep Pro, and your renewal will be at the Pro price.'
      : 'Done. You are now on Pro. Stripe will email a receipt for the difference.'));
  } catch (err) {
    console.error('upgrade failed', err);
    return back(req, id, 'billing=' + encodeURIComponent('We could not upgrade you just now. Please try again in a minute.'));
  }
}
