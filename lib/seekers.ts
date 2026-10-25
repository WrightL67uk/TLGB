import 'server-only';
import { db } from './supabase';
import { getSessionEmail } from './session';
import { isPaid } from './membership';

export type Seeker = {
  id: string; email: string; created_at: string; updated_at: string;
  status: 'draft' | 'live' | 'paused' | 'removed';
  published_at: string | null; expires_at: string | null; removed_reason: string | null;
  first_name: string; last_name: string; show_full_name: boolean;
  headline: string | null; about: string | null;
  postcode: string | null; lat: number | null; lng: number | null; area: string | null;
  travel_miles: number; stay_away: boolean; years_experience: number | null; level: string | null;
  skills: string[]; other_skills: string | null; cards: string[]; other_cards: string | null; licences: string[];
  vehicle: string | null; tools: string | null; work_types: string[]; team_size: number;
  available_from: string | null; available_until: string | null;
  pay_min: number | null; pay_max: number | null; pay_period: string | null;
  past_employers: string | null; phone: string | null; show_phone: boolean; show_email: boolean; view_count: number;
};

export async function seekerByEmail(email: string): Promise<Seeker | null> {
  const { data } = await db().from('job_seekers').select('*').eq('email', email).neq('status', 'removed').maybeSingle();
  return (data as Seeker | null) ?? null;
}

/** The logged-in job seeker, if the session belongs to one. */
export async function getSeeker() {
  const email = await getSessionEmail();
  return email ? seekerByEmail(email) : null;
}

/** On the board: published and not past its expiry. */
export const seekerLive = (s: Pick<Seeker, 'status' | 'expires_at'>) =>
  s.status === 'live' && !!s.expires_at && new Date(s.expires_at) > new Date();

/** Name shown to employers who can see contact details. */
export const seekerName = (s: Pick<Seeker, 'first_name' | 'last_name' | 'show_full_name'>) =>
  s.show_full_name ? `${s.first_name} ${s.last_name}` : `${s.first_name} ${s.last_name.charAt(0).toUpperCase()}.`;

/**
 * Who may see names and contact details: paying members and people at approved main
 * contractors. Everyone else sees the anonymised profile.
 */
export async function employerAccess(email: string | null): Promise<{ ok: boolean; who: 'member' | 'contractor' | 'unpaid' | 'none' }> {
  if (!email) return { ok: false, who: 'none' };
  const { data: biz } = await db().from('businesses').select('status, founding_member, subscription_status').eq('email', email).eq('status', 'approved');
  if ((biz ?? []).some(isPaid)) return { ok: true, who: 'member' };
  const { data: user } = await db().from('contractor_users').select('company_id').eq('email', email).is('removed_at', null).maybeSingle();
  if (user) {
    const { data: co } = await db().from('contractor_companies').select('status').eq('id', user.company_id).maybeSingle();
    if (co?.status === 'approved') return { ok: true, who: 'contractor' };
  }
  return { ok: false, who: biz?.length ? 'unpaid' : 'none' };
}
