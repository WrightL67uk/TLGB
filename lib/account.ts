import 'server-only';
import { db } from './supabase';
import { getSessionEmail } from './session';
import { emailAdminChanges } from './email';

export type Business = {
  id: string;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'suspended';
  business_type: 'ltd' | 'sole_trader';
  company_number: string | null;
  owner_full_name: string | null;
  trading_name: string;
  contact_name: string;
  email: string;
  phone: string;
  website: string | null;
  business_address: string | null;
  description: string | null;
  base_postcode: string;
  lat: number;
  lng: number;
  radius_miles: number;
  trades: string[];
  accreditations: string[];
  accreditation_expiries: Record<string, string> | null;
  turnover_band: string | null;
  pl_cover_amount: number | null;
  pl_expiry: string | null;
  el_cover_amount: number | null;
  el_expiry: string | null;
  rejection_reason: string | null;
  recheck_required: boolean;
  recheck_reason: string | null;
  founding_member: boolean;
  subscription_status: string;
};

type Owned = { ok: true; email: string; business: Business } | { ok: false; status: 401 | 404; error: string };

/** Loads a listing only if it belongs to the logged-in trade. */
export async function ownedBusiness(id: string): Promise<Owned> {
  const email = await getSessionEmail();
  if (!email) return { ok: false, status: 401, error: 'Your login has expired. Log in again.' };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, status: 404, error: 'Listing not found.' };
  const { data } = await db().from('businesses').select('*').eq('id', id).maybeSingle();
  if (!data || data.email !== email || data.status === 'draft') {
    return { ok: false, status: 404, error: 'Listing not found.' };
  }
  return { ok: true, email, business: data as Business };
}

/**
 * Approved listings stay live when a trade changes something important,
 * but get flagged for the admin to check. Admin is emailed once per batch
 * (only when the flag goes from off to on).
 */
export async function flagForRecheck(b: Business, reasons: string[], actor: string) {
  if (b.status !== 'approved' || reasons.length === 0) return;
  const reason = [b.recheck_reason, ...reasons].filter(Boolean).join('; ').slice(0, 1000);
  await db().from('businesses').update({ recheck_required: true, recheck_reason: reason }).eq('id', b.id);
  await db().from('review_events').insert({ business_id: b.id, action: 'changed', actor, detail: reasons.join('; ') });
  if (!b.recheck_required) {
    await emailAdminChanges({ id: b.id, tradingName: b.trading_name }, 'changed', reasons.join('; '));
  }
}

export const DOC_FIELD_TYPE: Record<string, string> = {
  letterhead: 'letterhead',
  pl_certificate: 'public_liability',
  el_certificate: 'employers_liability',
  accreditation_docs: 'accreditation',
};

export const DOC_TYPE_LABEL: Record<string, string> = {
  letterhead: 'Letterhead',
  public_liability: 'Public liability certificate',
  employers_liability: 'Employers liability certificate',
  accreditation: 'Accreditation certificate',
  other: 'Other document',
};
