import 'server-only';
import { db } from './supabase';
import { stripe, stripeEnabled, mapStatus, periodEnd } from './stripe';

/**
 * Daily safety net in case a Stripe webhook was missed: any membership whose paid period
 * ended more than a day ago is re-read from Stripe.
 */
export async function syncOverdueMemberships() {
  if (!stripeEnabled()) return 0;
  const cutoff = new Date(Date.now() - 86_400_000).toISOString();
  const { data } = await db()
    .from('businesses')
    .select('id, stripe_subscription_id')
    .in('subscription_status', ['active', 'trialing', 'past_due'])
    .not('stripe_subscription_id', 'is', null)
    .lt('paid_until', cutoff)
    .limit(50);
  let n = 0;
  for (const b of data ?? []) {
    try {
      const sub = await stripe('GET', `subscriptions/${b.stripe_subscription_id}`);
      await db().from('businesses').update({ subscription_status: mapStatus(sub.status), paid_until: periodEnd(sub) }).eq('id', b.id);
      n++;
    } catch (err) {
      console.error('billing sync failed', b.id, err);
    }
  }
  return n;
}
