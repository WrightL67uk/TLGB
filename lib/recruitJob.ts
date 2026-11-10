import 'server-only';
import { db } from './supabase';
import { siteUrl } from './config';
import { payText, label, LEVELS, skillLabel } from './seekerTypes';
import { qualLabel } from './teamTypes';
import { seekerMatchesFilters, seekerSuitsVacancy, type Vacancy } from './vacancies';
import type { Seeker } from './seekers';
import { emailSeekerVacancy, emailEmployerNewPeople } from './email';

/** Remembers an email was sent. Returns false if it had already been sent (so we skip it). */
async function claim(kind: string, to: string, item: string) {
  const { error } = await db().from('recruit_sent').insert({ kind, to_email: to.toLowerCase(), item_id: item });
  return !error;
}

async function liveSeekers() {
  const { data } = await db().from('job_seekers').select('*').eq('status', 'live').gt('expires_at', new Date().toISOString()).limit(5000);
  return (data ?? []) as (Seeker & { vacancy_alerts?: boolean })[];
}

/** Emails every job seeker whose profile suits this vacancy. Run when it is posted. */
export async function alertSeekersAboutVacancy(vacancyId: string) {
  const { data: v } = await db().from('vacancies').select('*, businesses(trading_name)').eq('id', vacancyId).maybeSingle();
  if (!v || v.status !== 'live') return 0;
  const vac = v as Vacancy & { businesses: { trading_name: string } | null };
  let sent = 0;
  for (const s of await liveSeekers()) {
    if (s.vacancy_alerts === false || !seekerSuitsVacancy(s, vac)) continue;
    if (!(await claim('vacancy', s.email, vac.id))) continue;
    await emailSeekerVacancy(s.email, s.first_name, {
      title: vac.title,
      business: vac.businesses?.trading_name ?? 'A TLGB member',
      area: vac.area ?? '',
      pay: payText(vac),
      url: `${siteUrl()}/recruitment/vacancies/${vac.id}`,
    });
    sent++;
  }
  await db().from('vacancies').update({ alerts_done_at: new Date().toISOString() }).eq('id', vac.id);
  return sent;
}

/** A short description of a saved search, for the email. */
export function describeAlert(a: { skill: string | null; level: string | null; card: string | null; postcode: string | null; own_vehicle: boolean; available_now: boolean }) {
  const bits = [
    a.level ? label(LEVELS, a.level) : null,
    a.skill ? skillLabel(a.skill) : null,
    a.card ? qualLabel(a.card) : null,
    a.postcode ? `near ${a.postcode}` : null,
    a.own_vehicle ? 'own vehicle' : null,
    a.available_now ? 'available now' : null,
  ].filter(Boolean);
  return bits.length ? bits.join(', ') : 'anyone new';
}

/**
 * Daily: emails employers about new job seekers matching their saved searches (one email per
 * search), and catches any vacancy whose alerts did not go out when it was posted.
 */
export async function runRecruitAlerts() {
  const out = { employerEmails: 0, vacanciesCaughtUp: 0 };

  const { data: pending } = await db().from('vacancies').select('id').eq('status', 'live').is('alerts_done_at', null).limit(50);
  for (const p of pending ?? []) { await alertSeekersAboutVacancy(p.id); out.vacanciesCaughtUp++; }

  const { data: alerts } = await db().from('recruit_alerts').select('*').limit(2000);
  if (!alerts?.length) return out;
  const seekers = await liveSeekers();
  for (const a of alerts) {
    const since = a.last_checked_at as string;
    const fresh = seekers.filter((s) => (s.published_at ?? '') > since && seekerMatchesFilters(s, {
      skill: a.skill, level: a.level, card: a.card, own_vehicle: a.own_vehicle, available_now: a.available_now, lat: a.lat, lng: a.lng,
    }));
    const toSend = [];
    for (const s of fresh) if (await claim('person', `${a.email}#${a.id}`, s.id)) toSend.push(s);
    await db().from('recruit_alerts').update({ last_checked_at: new Date().toISOString() }).eq('id', a.id);
    if (!toSend.length) continue;
    await emailEmployerNewPeople(a.email, describeAlert(a), toSend.map((s) => ({
      headline: s.headline ?? 'Job seeker',
      area: s.area ?? '',
      role: label(LEVELS, s.level) ?? '',
      url: `${siteUrl()}/recruitment/${s.id}`,
    })), `${siteUrl()}/api/recruit-alerts?off=${a.token}`);
    out.employerEmails++;
  }
  return out;
}
