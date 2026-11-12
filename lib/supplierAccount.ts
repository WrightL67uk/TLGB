import 'server-only';
import { db } from './supabase';
import { getSessionEmail } from './session';
import { PAID_STATUSES } from './membership';
import type { SupplierTier } from './supplierPricing';
export { DELIVERY_OPTIONS, STANDARDS, standardLabel } from './supplierOptions';

export type Supplier = {
  id: string;
  status: 'started' | 'pending' | 'approved' | 'rejected';
  tier: SupplierTier | null;
  subscription_status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  paid_until: string | null;
  signup_code: string | null;
  slug: string | null;
  name: string;
  contact_name: string | null;
  email: string | null;
  public_email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  town: string | null;
  postcode: string | null;
  lat: number | null;
  lng: number | null;
  delivers_nationally: boolean;
  categories: string[];
  description: string | null;
  about: string | null;
  business_type: 'ltd' | 'sole_trader' | null;
  company_number: string | null;
  ch_company_name: string | null;
  ch_registered_address: string | null;
  ch_incorporated_on: string | null;
  vat_registered: boolean | null;
  vat_number: string | null;
  year_established: number | null;
  delivery_options: string[];
  min_order: string | null;
  trade_accounts: boolean;
  trade_only: boolean;
  standards: string[];
  standards_other: string | null;
  product_liability: boolean | null;
  logo_path: string | null;
  quote_requests: boolean;
  quote_plan: string | null;
  rejection_reason?: string | null;
};



export const slugFor = (name: string) =>
  name.toLowerCase().replace(/&/g, ' and ').replace(/\b(ltd|limited|llp|plc)\b/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'supplier';

/** A slug nobody else has: name, then name-2, name-3. */
const RESERVED_SLUGS = new Set(['add', 'join']);
export async function freeSlug(name: string, selfId?: string) {
  const base = RESERVED_SLUGS.has(slugFor(name)) ? `${slugFor(name)}-supplier` : slugFor(name);
  for (let i = 1; i < 50; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const { data } = await db().from('suppliers').select('id').eq('slug', slug).maybeSingle();
    if (!data || data.id === selfId) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

type Owned = { ok: true; email: string; supplier: Supplier } | { ok: false; status: 401 | 404; error: string };

/** Loads a supplier only if it belongs to the logged-in person. */
export async function ownedSupplier(id: string): Promise<Owned> {
  const email = await getSessionEmail();
  if (!email) return { ok: false, status: 401, error: 'Your login has expired. Log in again.' };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, status: 404, error: 'Listing not found.' };
  const { data } = await db().from('suppliers').select('*').eq('id', id).maybeSingle();
  if (!data || (data.email ?? '').toLowerCase() !== email) return { ok: false, status: 404, error: 'Listing not found.' };
  return { ok: true, email, supplier: data as Supplier };
}

export const isSubscribed = (s: Pick<Supplier, 'subscription_status'>) => PAID_STATUSES.includes(s.subscription_status);

/**
 * Shown to the public: approved, and either an older free listing (no plan) or a plan that is paid up.
 * A supplier whose plan has ended drops out of the directory until they pay again.
 */
export const isLive = (s: Pick<Supplier, 'status' | 'tier' | 'subscription_status'>) =>
  s.status === 'approved' && (!s.tier || isSubscribed(s));

/** Full contact details and a profile page are for paying suppliers. */
export const hasProfile = (s: Pick<Supplier, 'status' | 'tier' | 'subscription_status' | 'slug'>) =>
  s.status === 'approved' && !!s.tier && !!s.slug && isSubscribed(s);

export const cleanVat = (v: string) => v.toUpperCase().replace(/[\s-]/g, '').replace(/^GB/, '');
export const vatOk = (v: string) => /^\d{9}(\d{3})?$/.test(cleanVat(v));

export type SupplierPhoto = { id: string; storage_path: string; caption: string | null; sort_order: number };
export async function photosFor(supplierId: string) {
  const { data } = await db().from('supplier_photos').select('id, storage_path, caption, sort_order').eq('supplier_id', supplierId).order('sort_order').order('created_at');
  return (data ?? []) as SupplierPhoto[];
}
export const MAX_SUPPLIER_PHOTOS = 12;
