import 'server-only';
import { cache } from 'react';
import { db } from './supabase';
import { TURNOVER_BANDS } from './config';

// Membership prices live in site_settings so they can be changed from the admin Prices page.
// Three ways of charging, chosen by the admin: by turnover band; Verified and Pro plans; or a free
// listing alongside verified membership paid monthly or yearly, with a free trial.

export type PlanKey = 'verified' | 'pro';
export type PricingMode = 'bands' | 'plans' | 'membership';
export type Interval = 'month' | 'year';
export type Pricing = {
  mode: PricingMode;
  bands: Record<string, number>;
  plans: Record<PlanKey, number>;
  membership: { monthly: number; yearly: number; trial_days: number };
};

export const PLAN_INFO: Record<PlanKey, { label: string; blurb: string }> = {
  verified: {
    label: 'Verified',
    blurb: 'Verified listing in search, compliance pack, PQQ answer bank, Help Hub, price requests and templates.',
  },
  pro: {
    label: 'Pro',
    blurb: 'Everything in Verified, plus the full leads feed and the supply chain finder.',
  },
};

export const DEFAULT_PRICING: Pricing = {
  mode: 'bands',
  bands: Object.fromEntries(TURNOVER_BANDS.map((b) => [b.key, b.price])),
  plans: { verified: 295, pro: 595 },
  membership: { monthly: 30, yearly: 300, trial_days: 30 },
};

const whole = (v: unknown, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 && n < 100000 ? n : fallback;
};

export function cleanPricing(raw: unknown): Pricing {
  const r = (raw ?? {}) as Partial<Pricing>;
  return {
    mode: r.mode === 'plans' || r.mode === 'membership' ? r.mode : 'bands',
    bands: Object.fromEntries(TURNOVER_BANDS.map((b) => [b.key, whole(r.bands?.[b.key], DEFAULT_PRICING.bands[b.key])])),
    plans: {
      verified: whole(r.plans?.verified, DEFAULT_PRICING.plans.verified),
      pro: whole(r.plans?.pro, DEFAULT_PRICING.plans.pro),
    },
    membership: {
      monthly: whole(r.membership?.monthly, DEFAULT_PRICING.membership.monthly),
      yearly: whole(r.membership?.yearly, DEFAULT_PRICING.membership.yearly),
      trial_days: Math.max(0, Math.min(90, Math.round(Number(r.membership?.trial_days ?? DEFAULT_PRICING.membership.trial_days)) || 0)),
    },
  };
}

/** Current prices. Falls back to the defaults if the settings row is missing. */
export const getPricing = cache(async (): Promise<Pricing> => {
  const { data, error } = await db().from('site_settings').select('value').eq('key', 'pricing').maybeSingle();
  if (error) console.error('pricing read failed', error);
  return cleanPricing(data?.value);
});

export async function savePricing(p: Pricing) {
  return db().from('site_settings').upsert({ key: 'pricing', value: p, updated_at: new Date().toISOString() });
}

/** Turnover bands with today's prices, for forms and pages. */
export function bandsWithPrices(p: Pricing) {
  return TURNOVER_BANDS.map((b) => ({ key: b.key, label: b.label, price: p.bands[b.key] ?? b.price }));
}

export function bandPrice(p: Pricing, key: string | null | undefined) {
  const b = TURNOVER_BANDS.find((x) => x.key === key);
  return b ? { label: b.label, price: p.bands[b.key] ?? b.price } : null;
}

export const planKey = (v: unknown): PlanKey => (v === 'pro' ? 'pro' : 'verified');

/**
 * Does this paid listing get Pro-only tools? With turnover pricing, every member gets everything.
 * Members who joined on turnover pricing have no plan; they keep every tool they paid for if
 * pricing is later switched to Verified and Pro.
 */
export function hasPro(p: Pricing, b: { founding_member: boolean; plan?: string | null }) {
  return p.mode !== 'plans' || b.founding_member || b.plan === 'pro' || !b.plan;
}

/** How a yearly payment compares with twelve monthly ones, for the "2 months free" wording. */
export function yearlySaving(p: Pricing) {
  const { monthly, yearly } = p.membership;
  const pounds = monthly * 12 - yearly;
  return { pounds: Math.max(0, pounds), months: pounds > 0 ? Math.round(pounds / monthly) : 0, perMonth: Math.round((yearly / 12) * 100) / 100 };
}

/** Where an unpaid trade goes to join or upgrade: the plan screen when members choose free, monthly or yearly. */
export function upgradeHref(p: Pricing, businessId: string) {
  return p.mode === 'membership' ? `/account/${businessId}/plan` : `/account/${businessId}#membership`;
}

/** Button wording for joining or upgrading. */
export function upgradeLabel(p: Pricing, hasPaidBefore = false) {
  return p.mode === 'membership' && p.membership.trial_days > 0 && !hasPaidBefore
    ? `start ${p.membership.trial_days} day free trial`
    : 'start membership';
}
