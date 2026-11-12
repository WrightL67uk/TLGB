import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { stripe, verifyWebhook, mapStatus, periodEnd } from '@/lib/stripe';
import { emailAdminBilling, emailMemberPaymentFailed, emailAdminSupplier } from '@/lib/email';
import { PAID_STATUSES } from '@/lib/membership';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

async function findBusiness(by: { id?: string | null; sub?: string | null; customer?: string | null }) {
  const q = () => db().from('businesses').select('id, trading_name, email, subscription_status');
  if (by.id) { const { data } = await q().eq('id', by.id).maybeSingle(); if (data) return data; }
  if (by.sub) { const { data } = await q().eq('stripe_subscription_id', by.sub).maybeSingle(); if (data) return data; }
  if (by.customer) { const { data } = await q().eq('stripe_customer_id', by.customer).limit(1).maybeSingle(); if (data) return data; }
  return null;
}

async function findSupplier(by: { id?: string | null; sub?: string | null; customer?: string | null }) {
  const q = () => db().from('suppliers').select('id, name, email, tier, status, subscription_status, quote_plan');
  if (by.id) { const { data } = await q().eq('id', by.id).maybeSingle(); if (data) return data; }
  if (by.sub) { const { data } = await q().eq('stripe_subscription_id', by.sub).maybeSingle(); if (data) return data; }
  if (by.customer) { const { data } = await q().eq('stripe_customer_id', by.customer).limit(1).maybeSingle(); if (data) return data; }
  return null;
}

/** A supplier's yearly plan. Match also switches on estimate requests for as long as it is paid up. */
async function applySupplierSubscription(sub: Json) {
  const s = await findSupplier({ id: sub.metadata?.supplier_id, sub: sub.id, customer: sub.customer });
  if (!s) { console.warn('webhook: no supplier for subscription', sub.id); return; }
  const status = mapStatus(sub.status);
  const until = periodEnd(sub);
  const tier = sub.metadata?.tier === 'match' || sub.metadata?.tier === 'appear' ? sub.metadata.tier : s.tier;
  const paying = PAID_STATUSES.includes(status);
  const quote: Json = {};
  if (s.quote_plan !== 'founding') {
    if (tier === 'match' && paying && until) Object.assign(quote, { quote_requests: true, quote_plan: 'paid', quote_paid_until: until.slice(0, 10) });
    else if (s.quote_plan === 'paid') Object.assign(quote, { quote_requests: false, quote_plan: null, quote_paid_until: null });
  }
  await db().from('suppliers').update({
    stripe_subscription_id: sub.id,
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
    subscription_status: status,
    paid_until: until,
    billing_interval: 'year',
    ...(tier ? { tier } : {}),
    ...quote,
  }).eq('id', s.id);
  if (status !== s.subscription_status) {
    const label = tier === 'match' ? 'Match' : 'Appear';
    if (status === 'active' && (s.subscription_status === 'none' || s.subscription_status === 'cancelled')) {
      await emailAdminSupplier(`New paying supplier: ${s.name}`, `${s.name} has paid for the ${label} plan.`, s.id);
    }
    if (status === 'cancelled') {
      await emailAdminSupplier(`Supplier plan ended: ${s.name}`, `${s.name}'s ${label} plan has ended. Their listing no longer shows in the supplier directory.`, s.id);
    }
  }
}

async function applySubscription(sub: Json) {
  if (sub.metadata?.supplier_id) return applySupplierSubscription(sub);
  const b = await findBusiness({ id: sub.metadata?.business_id, sub: sub.id, customer: sub.customer });
  if (!b) { console.warn('webhook: no listing for subscription', sub.id); return; }
  const status = mapStatus(sub.status);
  await db().from('businesses').update({
    stripe_subscription_id: sub.id,
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
    subscription_status: status,
    paid_until: periodEnd(sub),
    ...(sub.metadata?.plan === 'pro' || sub.metadata?.plan === 'verified' ? { plan: sub.metadata.plan } : {}),
    ...(sub.metadata?.interval === 'month' || sub.metadata?.interval === 'year' ? { billing_interval: sub.metadata.interval } : {}),
  }).eq('id', b.id);
  if (status !== b.subscription_status) {
    await db().from('review_events').insert({ business_id: b.id, action: 'billing', actor: 'stripe', detail: `Membership ${b.subscription_status} to ${status}` });
    if (status === 'active' && (b.subscription_status === 'none' || b.subscription_status === 'cancelled')) {
      await emailAdminBilling(`New paying member: ${b.trading_name}`, `${b.trading_name} has started a paid membership.`, b.id);
    }
    if (status === 'trialing' && b.subscription_status === 'none') {
      await emailAdminBilling(`New member on trial: ${b.trading_name}`, `${b.trading_name} has started a membership trial.`, b.id);
    }
    if (status === 'cancelled') {
      await emailAdminBilling(`Membership ended: ${b.trading_name}`, `${b.trading_name}'s membership has ended. Their listing no longer shows in search.`, b.id);
    }
  }
}

/** Notes which discount code a paid checkout used, for the admin Discount codes page. */
async function recordDiscount(session: Json) {
  const promo = (session.discounts ?? []).map((d: Json) => (typeof d.promotion_code === 'string' ? d.promotion_code : d.promotion_code?.id)).find(Boolean);
  if (!promo) return;
  const { data: code } = await db().from('discount_codes').select('id').eq('stripe_promo_id', promo).maybeSingle();
  if (!code) return;
  const sup = session.metadata?.supplier_id ? await findSupplier({ id: session.metadata.supplier_id, customer: session.customer }) : null;
  const b = sup ? null : await findBusiness({ id: session.metadata?.business_id ?? session.client_reference_id, customer: session.customer });
  await db().from('discount_redemptions').insert({
    code_id: code.id,
    business_id: b?.id ?? null,
    supplier_id: sup?.id ?? null,
    stripe_session_id: session.id,
    amount_off_pence: session.total_details?.amount_discount ?? null,
  });
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyWebhook(raw, req.headers.get('stripe-signature'))) return NextResponse.json({ ok: false }, { status: 400 });
  const event = JSON.parse(raw) as Json;

  // Each event once only
  const { error: dupe } = await db().from('stripe_events').insert({ id: event.id, type: event.type });
  if (dupe) return NextResponse.json({ ok: true, duplicate: true });

  try {
    const obj = event.data?.object as Json;
    switch (event.type) {
      case 'checkout.session.completed': {
        if (obj.mode === 'subscription' && obj.subscription) {
          const sub = await stripe('GET', `subscriptions/${obj.subscription}`);
          sub.metadata = obj.metadata?.supplier_id
            ? { supplier_id: obj.metadata.supplier_id, ...(sub.metadata ?? {}) }
            : { business_id: obj.metadata?.business_id ?? obj.client_reference_id, ...(sub.metadata ?? {}) };
          await applySubscription(sub);
          await recordDiscount(obj);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await applySubscription(obj);
        break;
      case 'invoice.paid': {
        const subId = obj.subscription ?? obj.parent?.subscription_details?.subscription;
        if (subId) await applySubscription(await stripe('GET', `subscriptions/${subId}`));
        break;
      }
      case 'invoice.payment_failed': {
        const sup = await findSupplier({ customer: obj.customer });
        if (sup) {
          if (sup.email) await emailMemberPaymentFailed(sup.email, sup.name);
          await emailAdminSupplier(`Payment failed: ${sup.name}`, `A supplier plan payment for ${sup.name} failed. Stripe will retry it automatically.`, sup.id);
          break;
        }
        const b = await findBusiness({ customer: obj.customer });
        if (b) {
          await emailMemberPaymentFailed(b.email, b.trading_name);
          await emailAdminBilling(`Payment failed: ${b.trading_name}`, `A membership payment for ${b.trading_name} failed. Stripe will retry it automatically.`, b.id);
        }
        break;
      }
    }
  } catch (err) {
    // Let Stripe retry: forget we saw it
    console.error('webhook handling failed', event.type, err);
    await db().from('stripe_events').delete().eq('id', event.id);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
