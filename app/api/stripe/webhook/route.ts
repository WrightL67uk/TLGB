import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { stripe, verifyWebhook, mapStatus, periodEnd } from '@/lib/stripe';
import { emailAdminBilling, emailMemberPaymentFailed } from '@/lib/email';

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

async function applySubscription(sub: Json) {
  const b = await findBusiness({ id: sub.metadata?.business_id, sub: sub.id, customer: sub.customer });
  if (!b) { console.warn('webhook: no listing for subscription', sub.id); return; }
  const status = mapStatus(sub.status);
  await db().from('businesses').update({
    stripe_subscription_id: sub.id,
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
    subscription_status: status,
    paid_until: periodEnd(sub),
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
          sub.metadata = { business_id: obj.metadata?.business_id ?? obj.client_reference_id, ...(sub.metadata ?? {}) };
          await applySubscription(sub);
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
