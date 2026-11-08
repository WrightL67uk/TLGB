import 'server-only';
import { db } from '@/lib/supabase';
import { stripe, stripeEnabled } from '@/lib/stripe';

// Discount codes for the yearly listing. Each code lives in our table and, once Stripe is
// switched on, as a Stripe coupon (the discount) plus a promotion code (the word people type).

export const CODE_COOKIE = 'tlgb_code';
// Promotion codes are created on a pinned API version so the request shape stays the same
// whatever version the Stripe account defaults to.
const PROMO_VERSION = '2024-06-20';

export type DiscountCode = {
  id: string;
  created_at: string;
  code: string;
  kind: 'percent' | 'amount';
  value: number;
  duration: 'once' | 'repeating' | 'forever';
  duration_months: number | null;
  max_uses: number | null;
  expires_on: string | null;
  first_time_only: boolean;
  note: string | null;
  active: boolean;
  stripe_coupon_id: string | null;
  stripe_promo_id: string | null;
};

export const cleanCode = (v: unknown) => String(v ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);

export function describe(c: Pick<DiscountCode, 'kind' | 'value' | 'duration' | 'duration_months'>) {
  const off = c.kind === 'percent' ? `${Number(c.value)}% off` : `£${Number(c.value).toFixed(2).replace(/\.00$/, '')} off`;
  if (c.duration === 'once') return `${off} the first year`;
  if (c.duration === 'forever') return `${off} every year`;
  const years = Math.max(1, Math.round((c.duration_months ?? 12) / 12));
  return `${off} for ${years} year${years === 1 ? '' : 's'}`;
}

/** True if the code can still be used, going by our own records. */
export function usable(c: DiscountCode, uses: number) {
  if (!c.active) return false;
  if (c.expires_on && new Date(c.expires_on + 'T23:59:59Z') < new Date()) return false;
  if (c.max_uses && uses >= c.max_uses) return false;
  return true;
}

export async function findCode(code: string) {
  const clean = cleanCode(code);
  if (!clean) return null;
  const { data } = await db().from('discount_codes').select('*').eq('code', clean).maybeSingle();
  if (!data) return null;
  const { count } = await db().from('discount_redemptions').select('id', { count: 'exact', head: true }).eq('code_id', data.id);
  return { code: data as DiscountCode, uses: count ?? 0 };
}

/** Makes the coupon and promotion code in Stripe for a code saved in our table. */
export async function pushToStripe(c: DiscountCode) {
  if (!stripeEnabled()) return c;
  let coupon = c.stripe_coupon_id;
  if (!coupon) {
    const made = await stripe('POST', 'coupons', {
      name: `${c.code}: ${describe(c)}`.slice(0, 40),
      ...(c.kind === 'percent' ? { percent_off: Number(c.value) } : { amount_off: Math.round(Number(c.value) * 100), currency: 'gbp' }),
      duration: c.duration,
      ...(c.duration === 'repeating' ? { duration_in_months: c.duration_months ?? 12 } : {}),
      metadata: { tlgb_code_id: c.id },
    });
    coupon = made.id as string;
    await db().from('discount_codes').update({ stripe_coupon_id: coupon }).eq('id', c.id);
  }
  let promo = c.stripe_promo_id;
  if (!promo) {
    const made = await stripe('POST', 'promotion_codes', {
      coupon,
      code: c.code,
      active: c.active ? 'true' : 'false',
      ...(c.max_uses ? { max_redemptions: c.max_uses } : {}),
      ...(c.expires_on ? { expires_at: Math.floor(new Date(c.expires_on + 'T23:59:59Z').getTime() / 1000) } : {}),
      ...(c.first_time_only ? { restrictions: { first_time_transaction: 'true' } } : {}),
      metadata: { tlgb_code_id: c.id },
    }, PROMO_VERSION);
    promo = made.id as string;
    await db().from('discount_codes').update({ stripe_promo_id: promo }).eq('id', c.id);
  }
  return { ...c, stripe_coupon_id: coupon, stripe_promo_id: promo };
}

export async function setActiveInStripe(c: DiscountCode, active: boolean) {
  if (!stripeEnabled() || !c.stripe_promo_id) return;
  await stripe('POST', `promotion_codes/${c.stripe_promo_id}`, { active: active ? 'true' : 'false' }, PROMO_VERSION);
}
