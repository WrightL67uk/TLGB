import 'server-only';
import { db } from './supabase';

// Supplier prices live in site_settings so they can be changed from the admin Prices page.
// Suppliers pay yearly only, through Stripe. Match includes everything in Appear.

export type SupplierTier = 'appear' | 'match';
export type SupplierPricing = Record<SupplierTier, number>;

export const SUPPLIER_TIERS: SupplierTier[] = ['appear', 'match'];

export const TIER_INFO: Record<SupplierTier, { label: string; tagline: string; features: string[] }> = {
  appear: {
    label: 'Appear',
    tagline: 'Be seen, and be contacted',
    features: [
      'Your own company profile page',
      'Pictures of your products and premises',
      'Phone, email and website shown on your listing',
      'Found by trade, product and postcode',
      'Listed above free suppliers',
    ],
  },
  match: {
    label: 'Match',
    tagline: 'Let the work come to you',
    features: [
      'Everything in Appear',
      'Matched to members’ price requests for what you supply',
      'Requests go straight to your inbox, ready to price online',
      'Prices compared side by side, so you can win on the day',
      'Top of the list when members search',
    ],
  },
};

export const DEFAULT_SUPPLIER_PRICING: SupplierPricing = { appear: 195, match: 495 };

const whole = (v: unknown, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 && n < 100000 ? n : fallback;
};

export function cleanSupplierPricing(raw: unknown): SupplierPricing {
  const r = (raw ?? {}) as Partial<SupplierPricing>;
  return { appear: whole(r.appear, DEFAULT_SUPPLIER_PRICING.appear), match: whole(r.match, DEFAULT_SUPPLIER_PRICING.match) };
}

export async function getSupplierPricing(): Promise<SupplierPricing> {
  const { data, error } = await db().from('site_settings').select('value').eq('key', 'supplier_pricing').maybeSingle();
  if (error) console.error('supplier pricing read failed', error);
  return cleanSupplierPricing(data?.value);
}

export async function saveSupplierPricing(p: SupplierPricing) {
  return db().from('site_settings').upsert({ key: 'supplier_pricing', value: p, updated_at: new Date().toISOString() });
}

export const tierKey = (v: unknown): SupplierTier | null => (v === 'appear' || v === 'match' ? v : null);
