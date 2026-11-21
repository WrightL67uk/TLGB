import 'server-only';
import { unstable_cache } from 'next/cache';
import { stripe, stripeEnabled } from '@/lib/stripe';

export const VAT_THRESHOLD = 90_000;
export const VAT_REVIEW_AT = 45_000;
export const VAT_WARN_AT = 80_000;

export type Payment = { id: string; created: number; paid: number; refunded: number; what: string; customer: string | null; email: string | null; name: string | null };
export type Takings = { year: number; month: number; checkedAt: string; payments: Payment[] } | null;

/** Card payments received in the last 12 months and last 30 days, less refunds, in pounds. */
async function load(): Promise<Takings> {
  if (!stripeEnabled()) return null;
  const now = Math.floor(Date.now() / 1000);
  const yearAgo = now - 365 * 86400;
  const monthAgo = now - 30 * 86400;
  let year = 0;
  let month = 0;
  const payments: Payment[] = [];
  let after: string | undefined;
  for (let page = 0; page < 100; page++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await stripe('GET', 'charges', { limit: 100, 'created[gte]': yearAgo, starting_after: after });
    for (const c of res.data) {
      if (c.status !== 'succeeded' || !c.paid || c.currency !== 'gbp') continue;
      const net = (c.amount - (c.amount_refunded ?? 0)) / 100;
      year += net;
      if (c.created >= monthAgo) month += net;
      payments.push({
        id: c.id, created: c.created, paid: c.amount / 100, refunded: (c.amount_refunded ?? 0) / 100,
        what: c.description || c.calculated_statement_descriptor || 'Card payment',
        customer: typeof c.customer === 'string' ? c.customer : null,
        email: c.billing_details?.email ?? c.receipt_email ?? null, name: c.billing_details?.name ?? null,
      });
    }
    if (!res.has_more || !res.data.length) break;
    after = res.data[res.data.length - 1].id;
  }
  return { year, month, checkedAt: new Date().toISOString(), payments };
}

// Refreshed at most once an hour so the admin page stays quick. Errors are not cached.
const cached = unstable_cache(load, ['vat-takings'], { revalidate: 3600, tags: ['vat'] });

export async function getTakings(): Promise<Takings | 'error'> {
  try {
    return await cached();
  } catch {
    return 'error';
  }
}

// ---- Forecast: what the current subscribers will pay over the next 12 months, if nobody leaves ----

export type ForecastSub = { customer: string | null; email: string | null; name: string | null; next12: number; charges: number };
export type Forecast = { subs: ForecastSub[]; total: number; checkedAt: string } | null;

const DAY = 86400;

/**
 * For every live subscription (trial, active or past due) works out what Stripe will charge in the next
 * 365 days at today's prices and discounts. Free trials are respected (first charge is at trial end) and
 * so are coupons (until they run out). Subscriptions already set to cancel are left out. No new sign-ups
 * are assumed. Amounts in pounds.
 */
async function loadForecast(): Promise<Forecast> {
  if (!stripeEnabled()) return null;
  const now = Math.floor(Date.now() / 1000);
  const horizon = now + 365 * DAY;
  const subs: ForecastSub[] = [];
  let after: string | undefined;
  for (let page = 0; page < 50; page++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await stripe('GET', 'subscriptions', { limit: 100, starting_after: after, expand: ['data.discounts', 'data.customer'] });
    for (const sub of res.data) {
      if (!['active', 'trialing', 'past_due'].includes(sub.status)) continue;
      if (sub.cancel_at_period_end || sub.cancel_at) continue;
      const items = sub.items?.data ?? [];
      const first = items[0];
      if (!first) continue;
      const next: number | undefined = sub.status === 'trialing' && sub.trial_end ? sub.trial_end : (sub.current_period_end ?? first.current_period_end);
      if (!next) continue;
      let gross = 0; // pence per charge
      let stepDays = 0;
      for (const it of items) {
        const price = it.price;
        if (!price?.recurring || price.currency !== 'gbp') continue;
        const count = price.recurring.interval_count ?? 1;
        const days = price.recurring.interval === 'year' ? 365 * count : price.recurring.interval === 'month' ? 30.4375 * count : price.recurring.interval === 'week' ? 7 * count : count;
        stepDays = stepDays ? Math.min(stepDays, days) : days;
        gross += (price.unit_amount ?? 0) * (it.quantity ?? 1);
      }
      if (!gross || !stepDays) continue;
      const disc = sub.discount ?? (typeof sub.discounts?.[0] === 'object' ? sub.discounts[0] : null);
      const coupon = disc?.coupon;
      const discEnd: number | null = disc?.end ?? null;
      let total = 0;
      let charges = 0;
      for (let k = 0; ; k++) {
        const when = next + Math.round(k * stepDays * DAY);
        if (when > horizon) break;
        let amt = gross;
        if (coupon) {
          const applies = coupon.duration === 'forever' || (discEnd ? when < discEnd : coupon.duration === 'once' ? k === 0 : false);
          if (applies) {
            if (coupon.percent_off) amt = amt * (1 - coupon.percent_off / 100);
            else if (coupon.amount_off) amt = Math.max(0, amt - coupon.amount_off);
          }
        }
        total += amt;
        charges++;
      }
      const cust = typeof sub.customer === 'object' && sub.customer ? sub.customer : null;
      subs.push({
        customer: typeof sub.customer === 'string' ? sub.customer : cust?.id ?? null,
        email: cust?.email ?? null, name: cust?.name ?? null,
        next12: total / 100, charges,
      });
    }
    if (!res.has_more || !res.data.length) break;
    after = res.data[res.data.length - 1].id;
  }
  return { subs, total: subs.reduce((a, x) => a + x.next12, 0), checkedAt: new Date().toISOString() };
}

const cachedForecast = unstable_cache(loadForecast, ['vat-forecast'], { revalidate: 3600, tags: ['vat'] });

export async function getForecast(): Promise<Forecast | 'error'> {
  try {
    return await cachedForecast();
  } catch {
    return 'error';
  }
}
