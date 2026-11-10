import 'server-only';
import { unstable_cache } from 'next/cache';
import { stripe, stripeEnabled } from '@/lib/stripe';

export const VAT_THRESHOLD = 90_000;
export const VAT_REVIEW_AT = 45_000;
export const VAT_WARN_AT = 80_000;

export type Takings = { year: number; month: number; checkedAt: string } | null;

/** Card payments received in the last 12 months and last 30 days, less refunds, in pounds. */
async function load(): Promise<Takings> {
  if (!stripeEnabled()) return null;
  const now = Math.floor(Date.now() / 1000);
  const yearAgo = now - 365 * 86400;
  const monthAgo = now - 30 * 86400;
  let year = 0;
  let month = 0;
  let after: string | undefined;
  for (let page = 0; page < 100; page++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await stripe('GET', 'charges', { limit: 100, 'created[gte]': yearAgo, starting_after: after });
    for (const c of res.data) {
      if (c.status !== 'succeeded' || !c.paid || c.currency !== 'gbp') continue;
      const net = (c.amount - (c.amount_refunded ?? 0)) / 100;
      year += net;
      if (c.created >= monthAgo) month += net;
    }
    if (!res.has_more || !res.data.length) break;
    after = res.data[res.data.length - 1].id;
  }
  return { year, month, checkedAt: new Date().toISOString() };
}

// Refreshed at most once an hour so the admin page stays quick. Errors are not cached.
const cached = unstable_cache(load, ['vat-takings'], { revalidate: 3600 });

export async function getTakings(): Promise<Takings | 'error'> {
  try {
    return await cached();
  } catch {
    return 'error';
  }
}
