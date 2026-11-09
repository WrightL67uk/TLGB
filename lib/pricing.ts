import 'server-only';
import { cache } from 'react';
import { db } from './supabase';
import { TURNOVER_BANDS } from './config';

// Membership prices live in site_settings so they can be changed from the admin Prices page.
// Two ways of charging: by turnover band, or Verified and Pro plans. The admin chooses which.

export type PlanKey = 'verified' | 'pro';
export type PricingMode = 'bands' | 'plans';
export type Pricing = {
  mode: PricingMode;
  bands: Record<string, number>;
  plans: Record<PlanKey, number>;
};

export const PLAN_INFO: Record<PlanKey, { label: string; blurb: string }> = {
  verified: {
    label: 'Verified',
    blurb: 'Verified listing in search, compliance pack, PQQ answer bank, help board, price requests and templates.',
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
};

const whole = (v: unknown, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 && n < 100000 ? n : fallback;
};

export function cleanPricing(raw: unknown): Pricing {
  const r = (raw ?? {}) as Partial<Pricing>;
  return {
    mode: r.mode === 'plans' ? 'plans' : 'bands',
    bands: Object.fromEntries(TURNOVER_BANDS.map((b) => [b.key, whole(r.bands?.[b.key], DEFAULT_PRICING.bands[b.key])])),
    plans: {
      verified: whole(r.plans?.verified, DEFAULT_PRICING.plans.verified),
      pro: whole(r.plans?.pro, DEFAULT_PRICING.plans.pro),
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
  return p.mode === 'bands' || b.founding_member || b.plan === 'pro' || !b.plan;
}
