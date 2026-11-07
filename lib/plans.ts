import 'server-only';
import { db } from './supabase';

import { MEMBER_PLANS } from './config';
export { MEMBER_PLANS };
export type PlanKey = keyof typeof MEMBER_PLANS;
export const planKey = (v: unknown): PlanKey => (v === 'pro' ? 'pro' : 'verified');

type ProFields = { founding_member?: boolean | null; plan?: string | null; pro_until?: string | null };

/** Pro features: paying for Pro, free Pro from a code that has not run out, or a founding member. */
export function hasPro(b: ProFields) {
  if (b.founding_member) return true;
  if (b.plan === 'pro') return true;
  return !!b.pro_until && new Date(b.pro_until).getTime() > Date.now();
}

/** Free Pro from a code that is still running (not counting paid Pro). */
export const freeProUntil = (b: ProFields) =>
  b.plan !== 'pro' && b.pro_until && new Date(b.pro_until).getTime() > Date.now() ? b.pro_until : null;

export const normaliseCode = (v: unknown) => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);

export type CodeKind = 'pro_free' | 'amount_off' | 'percent_off';
export type PromoCode = {
  code: string; label: string; kind: CodeKind; pro_months: number; amount_off: number | null; percent_off: number | null;
  duration: 'once' | 'forever'; stripe_coupon_id: string | null; max_redemptions: number | null; redeem_by: string | null; active: boolean;
};

/** Plain words for what a code gives, e.g. "Pro free for 12 months" or "£50 off the first year". */
export function describeOffer(c: Pick<PromoCode, 'kind' | 'pro_months' | 'amount_off' | 'percent_off' | 'duration'>) {
  const when = c.duration === 'forever' ? 'every year' : 'the first year';
  if (c.kind === 'amount_off') return `£${c.amount_off} off ${when}`;
  if (c.kind === 'percent_off') return `${c.percent_off}% off ${when}`;
  return `Pro free for ${c.pro_months} month${c.pro_months === 1 ? '' : 's'}`;
}

export type CodeCheck = { ok: true; promo: PromoCode } | { ok: false; reason: string };

/** Checks a code can be used by this listing right now. */
export async function checkCode(raw: unknown, businessId: string): Promise<CodeCheck> {
  const code = normaliseCode(raw);
  if (!code) return { ok: false, reason: 'Enter a code.' };
  const { data: c } = await db().from('promo_codes').select('*').eq('code', code).maybeSingle();
  if (!c || !c.active) return { ok: false, reason: `We don't recognise the code ${code}.` };
  const today = new Date().toISOString().slice(0, 10);
  if (c.redeem_by && c.redeem_by < today) return { ok: false, reason: `The code ${code} has expired.` };
  const { data: used } = await db().from('promo_redemptions').select('code').eq('business_id', businessId).maybeSingle();
  if (used) return { ok: false, reason: 'This listing has already used a code.' };
  if (c.max_redemptions) {
    const { count } = await db().from('promo_redemptions').select('business_id', { count: 'exact', head: true }).eq('code', code);
    if ((count ?? 0) >= c.max_redemptions) return { ok: false, reason: `The code ${code} has been used up.` };
  }
  return { ok: true, promo: c as PromoCode };
}

/** Records a code once the first payment has gone through. A free Pro code also switches Pro on. */
export async function redeemCode(businessId: string, rawCode: string) {
  const code = normaliseCode(rawCode);
  const { data: c } = await db().from('promo_codes').select('kind, pro_months').eq('code', code).maybeSingle();
  if (!c) return null;
  let until: string | null = null;
  if (c.kind === 'pro_free') {
    const d = new Date();
    d.setMonth(d.getMonth() + c.pro_months);
    until = d.toISOString();
  }
  const { error } = await db().from('promo_redemptions').insert({ business_id: businessId, code, pro_until: until });
  if (error) return null; // already redeemed
  await db().from('businesses').update({ promo_code: code, ...(until ? { pro_until: until, pro_reminder: 0 } : {}) }).eq('id', businessId);
  return { code, kind: c.kind as CodeKind, until };
}
