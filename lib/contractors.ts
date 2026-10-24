import 'server-only';
import { db } from './supabase';
import { getSessionEmail } from './session';
import { isPaid } from './membership';
import { liveAccreditations } from './expiries';
import { entitlements, type Entitlements } from './contractorPlans';
import { miles } from './resources';

export type ContractorCompany = {
  id: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  name: string;
  company_number: string | null;
  ch_company_name: string | null;
  ch_status: string | null;
  ch_registered_address: string | null;
  website: string | null;
  email_domain: string | null;
  phone: string | null;
  plan: string;
  plan_overrides: Record<string, unknown>;
  founding: boolean;
  rejection_reason: string | null;
  approved_at: string | null;
};

export type ContractorUser = {
  id: string;
  company_id: string;
  email: string;
  name: string;
  job_title: string | null;
  role: 'owner' | 'member';
  created_at: string;
};

export type Job = {
  id: string;
  company_id: string;
  posted_by: string;
  created_at: string;
  published_at: string | null;
  status: 'draft' | 'open' | 'closed' | 'removed';
  title: string;
  description: string;
  trades: string[];
  postcode: string;
  lat: number | null;
  lng: number | null;
  town: string | null;
  region: string | null;
  value_band: string | null;
  start_date: string | null;
  return_date: string | null;
  min_pl: number | null;
  accreditations: string[];
  docs_url: string | null;
  contact_name: string | null;
  contact_email: string | null;
  notified_count: number;
};

export type Me = { user: ContractorUser; company: ContractorCompany; can: Entitlements };

/** The logged-in contractor user and their company, or null. */
export async function getContractor(): Promise<Me | null> {
  const email = await getSessionEmail();
  if (!email) return null;
  return contractorByEmail(email);
}

export async function contractorByEmail(email: string): Promise<Me | null> {
  const { data: user } = await db().from('contractor_users').select('*').eq('email', email).is('removed_at', null).maybeSingle();
  if (!user) return null;
  const { data: company } = await db().from('contractor_companies').select('*').eq('id', user.company_id).maybeSingle();
  if (!company || company.status === 'rejected') return null;
  return { user: user as ContractorUser, company: company as ContractorCompany, can: entitlements(company) };
}

export const isUuid = (s: unknown): s is string => typeof s === 'string' && /^[0-9a-f-]{36}$/i.test(s);

/** A job belonging to this contractor's company. */
export async function ownJob(me: Me, id: string): Promise<Job | null> {
  if (!isUuid(id)) return null;
  const { data } = await db().from('contractor_jobs').select('*').eq('id', id).eq('company_id', me.company.id).neq('status', 'removed').maybeSingle();
  return (data as Job | null) ?? null;
}

/** Jobs that are open to reply to right now. */
export const jobIsOpen = (j: Pick<Job, 'status' | 'return_date'>) =>
  j.status === 'open' && (!j.return_date || j.return_date >= new Date().toISOString().slice(0, 10));

// ---------------------------------------------------------------
// Matching trades to a job
// ---------------------------------------------------------------
export type Candidate = {
  id: string; trading_name: string; email: string; contact_name: string; trades: string[];
  lat: number | null; lng: number | null; radius_miles: number; pl_cover_amount: number | null; pl_expiry: string | null;
  accreditations: string[]; accreditation_expiries: Record<string, string> | null; job_alerts: boolean;
  status: string; founding_member: boolean; subscription_status: string;
};

const CANDIDATE_COLS = 'id, trading_name, email, contact_name, trades, lat, lng, radius_miles, pl_cover_amount, pl_expiry, accreditations, accreditation_expiries, job_alerts, status, founding_member, subscription_status';

/** Does this listing meet what the job asks for? Area, trade, insurance and accreditations. */
export function meetsJob(b: Candidate, j: Pick<Job, 'trades' | 'lat' | 'lng' | 'min_pl' | 'accreditations'>) {
  const today = new Date().toISOString().slice(0, 10);
  if (!b.trades.some((t) => j.trades.includes(t))) return false;
  if (j.lat != null && j.lng != null && b.lat != null && b.lng != null && miles(b.lat, b.lng, j.lat, j.lng) > b.radius_miles) return false;
  if (!b.pl_expiry || b.pl_expiry < today) return false;
  if (j.min_pl && (b.pl_cover_amount ?? 0) < j.min_pl) return false;
  const live = liveAccreditations(b.accreditations, b.accreditation_expiries);
  return j.accreditations.every((a) => live.includes(a));
}

/** Paying members who match the job (for the alert email and the "who will see this" count). */
export async function matchingMembers(j: Pick<Job, 'trades' | 'lat' | 'lng' | 'min_pl' | 'accreditations'>) {
  const { data } = await db().from('businesses').select(CANDIDATE_COLS).eq('status', 'approved').overlaps('trades', j.trades).limit(5000);
  return ((data ?? []) as Candidate[]).filter((b) => isPaid(b) && meetsJob(b, j));
}

/** Can this trade (by login email) see the full job and reply? Paying members, or anyone invited. */
export async function memberAccess(email: string | null, jobId: string) {
  if (!email) return { paidListing: null, invitedListing: null };
  const { data: rows } = await db().from('businesses').select('id, trading_name, status, founding_member, subscription_status').eq('email', email).neq('status', 'draft');
  const listings = rows ?? [];
  const paidListing = listings.find((b) => isPaid(b)) ?? null;
  let invitedListing = null;
  if (listings.length && isUuid(jobId)) {
    const { data: inv } = await db().from('contractor_job_invites').select('business_id').eq('job_id', jobId).in('business_id', listings.map((b) => b.id));
    invitedListing = listings.find((b) => inv?.some((i) => i.business_id === b.id)) ?? null;
  }
  return { paidListing, invitedListing };
}

/** Everyone at the company who should hear about replies. */
export async function companyEmails(companyId: string) {
  const { data } = await db().from('contractor_users').select('email').eq('company_id', companyId).is('removed_at', null);
  return (data ?? []).map((u) => u.email as string);
}

/** Open jobs from approved contractors, newest first. Used here and on the leads page. */
export async function openJobs(limit = 200) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: jobs } = await db().from('contractor_jobs').select('*').eq('status', 'open')
    .or(`return_date.is.null,return_date.gte.${today}`).order('published_at', { ascending: false }).limit(limit);
  const list = (jobs ?? []) as Job[];
  const cids = [...new Set(list.map((j) => j.company_id))];
  const { data: cos } = cids.length ? await db().from('contractor_companies').select('id, name, status').in('id', cids) : { data: [] as never[] };
  const ok = new Map((cos ?? []).filter((c) => c.status === 'approved').map((c) => [c.id as string, c.name as string]));
  return list.filter((j) => ok.has(j.company_id)).map((j) => ({ ...j, company: ok.get(j.company_id)! }));
}
