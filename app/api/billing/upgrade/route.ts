import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { ownedBusiness } from '@/lib/account';
import { isPaid } from '@/lib/membership';
import { stripe, stripeEnabled, mapStatus, periodEnd } from '@/lib/stripe';
import { getPricing, PLAN_INFO } from '@/lib/pricing';

export const runtime = 'nodejs';

const back = (req: NextRequest, id: string, msg: string) =>
  NextResponse.redirect(new URL(`/account/${id}?billing=${encodeURIComponent(msg)}#membership`, req.url), 303);

/** Moves a paying Verified member onto Pro. Stripe charges the difference for the rest of their year straight away. */
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const id = String(fd?.get('business_id') ?? '');
  if (!sameOrigin(req)) return NextResponse.redirect(new URL('/account', req.url), 303);
  const own = await ownedBusiness(id);
  if (!own.ok) return NextResponse.redirect(new URL(own.status === 401 ? '/login?next=/account' : '/account', req.url), 303);
  const b = own.business;
  const pricing = await getPricing();

  if (pricing.mode !== 'plans') return back(req, id, 'Your membership already includes every tool.');
  if (b.founding_member || b.plan !== 'verified') return back(req, id, 'Your membership already includes every Pro tool.');
  if (!stripeEnabled() || !b.stripe_subscription_id || !isPaid(b)) {
    return back(req, id, 'We could not upgrade this membership online. Email admin@tlgb.co.uk and we will sort it.');
  }

  try {
    const sub = await stripe('GET', `subscriptions/${b.stripe_subscription_id}`);
    const current = sub.items?.data?.[0];
    const product = typeof current?.price?.product === 'string' ? current.price.product : current?.price?.product?.id;
    if (!current || !product) throw new Error('subscription has no item');
    const tax = process.env.STRIPE_AUTOMATIC_TAX === '1';
    const updated = await stripe('POST', `subscriptions/${sub.id}`, {
      items: [{
        id: current.id,
        price_data: {
          currency: 'gbp',
          product,
          unit_amount: pricing.plans.pro * 100,
          recurring: { interval: 'year' },
          ...(tax ? { tax_behavior: 'exclusive' } : {}),
        },
      }],
      proration_behavior: 'always_invoice',
      metadata: { ...(sub.metadata ?? {}), business_id: b.id, plan: 'pro' },
    });
    await db().from('businesses').update({ plan: 'pro', subscription_status: mapStatus(updated.status), paid_until: periodEnd(updated) }).eq('id', b.id);
    await db().from('review_events').insert({ business_id: b.id, action: 'billing', actor: 'member', detail: 'Upgraded to Pro' });
    return back(req, id, `Done. You are now on ${PLAN_INFO.pro.label}. Stripe will email a receipt for the difference.`);
  } catch (err) {
    console.error('upgrade failed', err);
    return back(req, id, 'We could not upgrade you just now. Please try again in a minute, or email admin@tlgb.co.uk.');
  }
}
