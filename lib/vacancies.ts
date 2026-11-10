import 'server-only';
import { db } from './supabase';
import { miles } from './resources';
import { availableNow } from './seekerTypes';
import type { Seeker } from './seekers';

/** Vacancies stay up this long, then drop off unless the member reposts. */
export const VACANCY_LIVE_DAYS = 60;
export const DEFAULT_VACANCY_LIMIT = 5;

export type Vacancy = {
  id: string; business_id: string; created_at: string; updated_at: string;
  status: 'live' | 'closed' | 'removed'; expires_at: string;
  title: string; level: string | null; skills: string[]; cards: string[]; work_types: string[];
  description: string; postcode: string; area: string | null; lat: number | null; lng: number | null;
  pay_min: number | null; pay_max: number | null; pay_period: string | null; start_date: string | null;
  own_vehicle: boolean; apply_email: string | null; apply_phone: string | null; apply_url: string | null;
  view_count: number; alerts_done_at: string | null;
};

export const vacancyLive = (v: Pick<Vacancy, 'status' | 'expires_at'>) => v.status === 'live' && new Date(v.expires_at) > new Date();

/** How many vacancy posts this business has used (everything it has posted except ones admin removed). */
export async function vacanciesUsed(businessId: string) {
  const { count } = await db().from('vacancies').select('id', { count: 'exact', head: true }).eq('business_id', businessId).neq('status', 'removed');
  return count ?? 0;
}

const seekerOnBoard = (s: Seeker) =>
  s.status === 'live' && !!s.expires_at && new Date(s.expires_at) > new Date() &&
  (!s.available_until || s.available_until >= new Date().toISOString().slice(0, 10));

const ownVehicle = (s: Pick<Seeker, 'vehicle'>) => s.vehicle === 'own' || s.vehicle === 'own_van';

/** Within reach: inside the seeker's daily travel (at least 5 miles), or they will stay away. */
function inReach(s: Pick<Seeker, 'lat' | 'lng' | 'travel_miles' | 'stay_away'>, lat: number | null, lng: number | null) {
  if (lat == null || lng == null) return true;
  if (s.lat == null || s.lng == null) return false;
  return s.stay_away || miles(lat, lng, s.lat, s.lng) <= Math.max(s.travel_miles, 5);
}

/** Does this job seeker suit this vacancy? Used for the emails to job seekers. */
export function seekerSuitsVacancy(s: Seeker, v: Vacancy) {
  if (!seekerOnBoard(s)) return false;
  if (v.level && s.level !== v.level) return false;
  if (v.skills.length && !v.skills.some((k) => s.skills.includes(k))) return false;
  if (v.cards.length && !v.cards.every((k) => s.cards.includes(k))) return false;
  if (v.work_types.length && s.work_types.length && !v.work_types.some((k) => s.work_types.includes(k))) return false;
  if (v.own_vehicle && !ownVehicle(s)) return false;
  return inReach(s, v.lat, v.lng);
}

export type PeopleFilters = { skill?: string | null; level?: string | null; card?: string | null; own_vehicle?: boolean; available_now?: boolean; lat?: number | null; lng?: number | null };

/** The Recruitment page filters, also used for employers' saved searches. */
export function seekerMatchesFilters(s: Seeker, f: PeopleFilters) {
  if (!seekerOnBoard(s)) return false;
  if (f.skill && !s.skills.includes(f.skill)) return false;
  if (f.level && s.level !== f.level) return false;
  if (f.card && !s.cards.includes(f.card)) return false;
  if (f.own_vehicle && !ownVehicle(s)) return false;
  if (f.available_now && !availableNow(s)) return false;
  return inReach(s, f.lat ?? null, f.lng ?? null);
}
