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

export type CodeCheck = { ok: true; code: string; months: number } | { ok: false; reason: string };

/** Checks a code can be used by this listing right now. */
export async function checkCode(raw: unknown, businessId: string): Promise<CodeCheck> {
  const code = normaliseCode(raw);
  if (!code) return { ok: false, reason: 'Enter a code.' };
  const { data: c } = await db().from('promo_codes').select('code, pro_months, max_redemptions, redeem_by, active').eq('code', code).maybeSingle();
  if (!c || !c.active) return { ok: false, reason: `We don't recognise the code ${code}.` };
  const today = new Date().toISOString().slice(0, 10);
  if (c.redeem_by && c.redeem_by < today) return { ok: false, reason: `The code ${code} has expired.` };
  const { data: used } = await db().from('promo_redemptions').select('code').eq('business_id', businessId).maybeSingle();
  if (used) return { ok: false, reason: 'This listing has already had a free Pro upgrade.' };
  if (c.max_redemptions) {
    const { count } = await db().from('promo_redemptions').select('business_id', { count: 'exact', head: true }).eq('code', code);
    if ((count ?? 0) >= c.max_redemptions) return { ok: false, reason: `All the free upgrades for ${code} have been used.` };
  }
  return { ok: true, code, months: c.pro_months };
}

/** Records a code once the first payment has gone through, and switches Pro on. */
export async function redeemCode(businessId: string, rawCode: string) {
  const code = normaliseCode(rawCode);
  const { data: c } = await db().from('promo_codes').select('pro_months').eq('code', code).maybeSingle();
  if (!c) return null;
  const until = new Date();
  until.setMonth(until.getMonth() + c.pro_months);
  const { error } = await db().from('promo_redemptions').insert({ business_id: businessId, code, pro_until: until.toISOString() });
  if (error) return null; // already redeemed
  await db().from('businesses').update({ pro_until: until.toISOString(), promo_code: code, pro_reminder: 0 }).eq('id', businessId);
  return until.toISOString();
}
