import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';

// A small Stripe client using Stripe's REST API directly, so the site needs no extra
// package. Only the handful of calls the membership flow uses are here.

export const stripeEnabled = () => !!process.env.STRIPE_SECRET_KEY;

type Params = Record<string, unknown>;

/** Stripe wants form encoding with bracketed keys: line_items[0][price_data][currency]=gbp */
function encode(params: Params, prefix = '', out: string[] = []) {
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => (typeof item === 'object' ? encode(item as Params, `${key}[${i}]`, out) : out.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`)));
    else if (typeof v === 'object') encode(v as Params, key, out);
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function stripe<T = any>(method: 'GET' | 'POST', path: string, params: Params = {}): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe is not set up (STRIPE_SECRET_KEY missing)');
  const body = encode(params).join('&');
  const url = `https://api.stripe.com/v1/${path}${method === 'GET' && body ? `?${body}` : ''}`;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: method === 'POST' ? body : undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Stripe ${path}: ${json?.error?.message ?? res.status}`);
  return json as T;
}

/** Checks the Stripe-Signature header on a webhook. Rejects anything older than 5 minutes. */
export function verifyWebhook(raw: string, header: string | null): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]).filter((p) => p.length === 2 && p[0] !== 'v1'));
  const sigs = header.split(',').filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex');
  return sigs.some((s) => s.length === expected.length && timingSafeEqual(Buffer.from(s), Buffer.from(expected)));
}

/** Stripe subscription status -> our listing status */
export function mapStatus(s: string): 'trialing' | 'active' | 'past_due' | 'cancelled' | 'none' {
  if (s === 'active') return 'active';
  if (s === 'trialing') return 'trialing';
  if (s === 'past_due' || s === 'unpaid') return 'past_due';
  if (s === 'canceled' || s === 'incomplete_expired') return 'cancelled';
  return 'none';
}

/** End of the period paid for. Newer API versions keep it on the subscription item. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function periodEnd(sub: any): string | null {
  const t = sub?.current_period_end ?? sub?.items?.data?.[0]?.current_period_end ?? sub?.trial_end;
  return typeof t === 'number' ? new Date(t * 1000).toISOString() : null;
}
