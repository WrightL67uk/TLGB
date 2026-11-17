import 'server-only';
import { randomBytes } from 'crypto';
import { db } from './supabase';
import { getSessionEmail } from './session';
import { siteUrl } from './config';

export type Agency = {
  id: string; created_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  name: string; company_number: string | null; ch_company_name: string | null; ch_status: string | null; ch_registered_address: string | null;
  website: string | null; email_domain: string | null; phone: string | null;
  email: string; contact_name: string; job_title: string | null;
  roles: string[]; placement_types: string[]; covers: string | null;
  el_expiry: string | null; pl_expiry: string | null; memberships: string[]; glaa_licence: string | null; rtw_confirmed: boolean;
  referral_code: string; referrals_per_credit: number | null; referral_monthly_cap: number | null;
  stripe_customer_id: string | null; stripe_subscription_id: string | null; subscription_status: string; paid_until: string | null;
  admin_notes: string | null; rejection_reason: string | null; approved_at: string | null;
};

export const PLACEMENT_TYPES = [
  { key: 'temporary', label: 'Temporary and contract' },
  { key: 'permanent', label: 'Permanent' },
];
export const AGENCY_BODIES = [
  { key: 'rec', label: 'REC (Recruitment and Employment Confederation)' },
  { key: 'apsco', label: 'APSCo' },
  { key: 'other', label: 'Another professional body' },
];
export const bodyLabel = (k: string) => AGENCY_BODIES.find((b) => b.key === k)?.label ?? k;

export async function agencyByEmail(email: string): Promise<Agency | null> {
  const { data } = await db().from('agencies').select('*').eq('email', email).neq('status', 'rejected').maybeSingle();
  return (data as Agency | null) ?? null;
}

/** The logged-in agency, or null. */
export async function getAgency(): Promise<Agency | null> {
  const email = await getSessionEmail();
  return email ? agencyByEmail(email) : null;
}

/** An approved agency by its login email (used to give it the same access as a paying employer). */
export async function approvedAgencyByEmail(email: string) {
  const { data } = await db().from('agencies').select('id').eq('email', email).eq('status', 'approved').maybeSingle();
  return data;
}

// ---------------------------------------------------------------
// Plan and credit settings (edited on the admin Agencies page)
// ---------------------------------------------------------------
export type AgencyPlan = { price: number; credits: number; per_referral_credit: number; referral_cap: number };
export const DEFAULT_AGENCY_PLAN: AgencyPlan = { price: 25, credits: 10, per_referral_credit: 3, referral_cap: 10 };

const whole = (v: unknown, fallback: number, min: number, max: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};
export function cleanAgencyPlan(raw: unknown): AgencyPlan {
  const r = (raw ?? {}) as Partial<AgencyPlan>;
  return {
    price: whole(r.price, DEFAULT_AGENCY_PLAN.price, 1, 10000),
    credits: whole(r.credits, DEFAULT_AGENCY_PLAN.credits, 1, 1000),
    per_referral_credit: whole(r.per_referral_credit, DEFAULT_AGENCY_PLAN.per_referral_credit, 1, 1000),
    referral_cap: whole(r.referral_cap, DEFAULT_AGENCY_PLAN.referral_cap, 0, 1000),
  };
}
export async function getAgencyPlan(): Promise<AgencyPlan> {
  const { data } = await db().from('site_settings').select('value').eq('key', 'agency_plan').maybeSingle();
  return cleanAgencyPlan(data?.value);
}
export async function saveAgencyPlan(p: AgencyPlan) {
  return db().from('site_settings').upsert({ key: 'agency_plan', value: p, updated_at: new Date().toISOString() });
}

// ---------------------------------------------------------------
// Credits
// ---------------------------------------------------------------
export async function creditBalance(agencyId: string): Promise<number> {
  const { data } = await db().from('agency_credit_ledger').select('delta').eq('agency_id', agencyId).limit(20000);
  return (data ?? []).reduce((sum, r) => sum + (r.delta as number), 0);
}

/** Adds (or takes off) credits. Returns false if this exact (reason, ref) was already recorded. */
export async function addCredits(agencyId: string, delta: number, reason: string, ref: string | null, note?: string) {
  const { error } = await db().from('agency_credit_ledger').insert({ agency_id: agencyId, delta, reason, ref, note: note ?? null });
  if (error && error.code !== '23505') console.error('credit ledger insert failed', error);
  return !error;
}

// ---------------------------------------------------------------
// Referral link and referral credits
// ---------------------------------------------------------------
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // no look-alike letters
export function newReferralCode() {
  const bytes = randomBytes(8);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}
export const referralLink = (code: string) => `${siteUrl()}/r/${code}`;
export const REF_COOKIE = 'tlgb_ref';

/**
 * Gives the agency a credit for every N job seekers (set in admin) who came through its link and
 * published a profile, up to a monthly cap. Safe to call as often as you like.
 */
export async function settleReferralCredits(agency: Pick<Agency, 'id' | 'referrals_per_credit' | 'referral_monthly_cap'>) {
  const plan = await getAgencyPlan();
  const per = agency.referrals_per_credit ?? plan.per_referral_credit;
  const cap = agency.referral_monthly_cap ?? plan.referral_cap;
  const { count } = await db().from('agency_referrals').select('id', { count: 'exact', head: true }).eq('agency_id', agency.id);
  const earned = Math.floor((count ?? 0) / per);
  if (!earned) return 0;
  const { data: rows } = await db().from('agency_credit_ledger').select('ref, created_at').eq('agency_id', agency.id).eq('reason', 'referral').limit(5000);
  const have = new Set((rows ?? []).map((r) => r.ref as string));
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  let thisMonth = (rows ?? []).filter((r) => new Date(r.created_at as string) >= monthStart).length;
  let given = 0;
  for (let k = 1; k <= earned; k++) {
    const ref = `batch-${k}`;
    if (have.has(ref)) continue;
    if (thisMonth >= cap) break;
    if (await addCredits(agency.id, 1, 'referral', ref, `${per} job seekers joined through your link`)) { given++; thisMonth++; }
  }
  return given;
}

export async function referralStats(agency: Pick<Agency, 'id' | 'referrals_per_credit'>) {
  const plan = await getAgencyPlan();
  const per = agency.referrals_per_credit ?? plan.per_referral_credit;
  const { count } = await db().from('agency_referrals').select('id', { count: 'exact', head: true }).eq('agency_id', agency.id);
  const total = count ?? 0;
  return { total, per, toNext: per - (total % per) };
}
