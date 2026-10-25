import 'server-only';
import { db } from './supabase';
import { emailSeekerExpiring } from './email';

/**
 * Daily: warns job seekers a week before their profile drops off the board, and deletes
 * profiles nobody has touched for a long time (unfinished after 90 days, any other after
 * 12 months off the board), as the privacy notice says.
 */
export async function runSeekerHousekeeping() {
  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();
  const out = { warned: 0, deleted: 0 };

  const { data: due } = await db().from('job_seekers').select('id, email, first_name, expires_at, view_count')
    .eq('status', 'live').is('expiry_warned_at', null).gt('expires_at', iso(now)).lt('expires_at', iso(now + 7 * 86_400_000)).limit(500);
  for (const s of due ?? []) {
    const { data: claimed } = await db().from('job_seekers').update({ expiry_warned_at: iso(now) }).eq('id', s.id).is('expiry_warned_at', null).select('id');
    if (!claimed?.length) continue;
    await emailSeekerExpiring(s.email, s.first_name, (s.expires_at as string).slice(0, 10), s.view_count as number);
    out.warned++;
  }

  const { count: drafts } = await db().from('job_seekers').delete({ count: 'exact' }).eq('status', 'draft').lt('updated_at', iso(now - 90 * 86_400_000));
  const { count: stale } = await db().from('job_seekers').delete({ count: 'exact' }).in('status', ['live', 'paused']).lt('updated_at', iso(now - 365 * 86_400_000)).lt('expires_at', iso(now - 300 * 86_400_000));
  out.deleted = (drafts ?? 0) + (stale ?? 0);
  return out;
}
