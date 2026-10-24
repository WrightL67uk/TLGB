import 'server-only';
import { db } from './supabase';
import { QUAL_TYPES, qualName, qualStatus, qualLabel } from './teamTypes';

export type TeamQual = {
  id: string; person_id: string; qual_type: string; detail: string | null; number: string | null;
  achieved_on: string | null; expiry: string | null;
};
export type TeamPerson = { id: string; name: string; role: string | null; quals: TeamQual[] };

export const TEAM_MAX_PEOPLE = 300;
export const TEAM_MAX_QUALS = 40;

const order = (k: string) => { const i = QUAL_TYPES.findIndex((q) => q.key === k); return i < 0 ? 999 : i; };

/** Everyone on the team with their cards, in catalogue order. */
export async function loadTeam(businessId: string): Promise<TeamPerson[]> {
  const [{ data: people }, { data: quals }] = await Promise.all([
    db().from('team_people').select('id, name, role').eq('business_id', businessId).order('name'),
    db().from('team_quals').select('id, person_id, qual_type, detail, number, achieved_on, expiry').eq('business_id', businessId),
  ]);
  const all = (quals ?? []) as TeamQual[];
  return (people ?? []).map((p) => ({
    id: p.id as string, name: p.name as string, role: (p.role as string | null) ?? null,
    quals: all.filter((q) => q.person_id === p.id).sort((a, b) => order(a.qual_type) - order(b.qual_type) || qualName(a).localeCompare(qualName(b))),
  }));
}

/** A factual line for PQQs, e.g. "Our training matrix covers 8 people. Current cards: 6 CSCS card, ..." */
export function teamSummary(team: TeamPerson[]): string | null {
  if (!team.length) return null;
  const live = team.flatMap((p) => p.quals.filter((q) => qualStatus(q.expiry).tone !== 'bad'));
  const counts = new Map<string, number>();
  for (const q of live) counts.set(q.qual_type, (counts.get(q.qual_type) ?? 0) + 1);
  const parts = [...counts.entries()]
    .sort((a, b) => order(a[0]) - order(b[0]))
    .map(([k, n]) => `${n} x ${qualLabel(k)}`);
  return [
    `Our training matrix covers ${team.length} ${team.length === 1 ? 'person' : 'people'} and records every card and qualification with its expiry date. We are reminded 60 days before anything expires so renewals are booked in time.`,
    parts.length ? `Current cards and qualifications: ${parts.join(', ')}.` : null,
  ].filter(Boolean).join('\n');
}
