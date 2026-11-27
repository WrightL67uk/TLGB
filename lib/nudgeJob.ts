import 'server-only';
import { db } from './supabase';
import { siteUrl } from './config';
import { planChosen } from './membership';
import { createLoginToken } from './session';
import { emailSignupNudge } from './email';

/**
 * Reminders to people who started signing up but have not sent their details: about 1 day, 3 days
 * and 7 days in, then every 2 days until they finish or press "stop these emails" (offered from the
 * 4th email). Each link logs them straight in to where they got to, and every email has an
 * "I'm stuck" button that tells admin and pauses the reminders.
 */
const STEPS_HOURS = [20, 68, 164]; // when nudges 1, 2 and 3 become due, from sign-up
const EVERY_HOURS = 44;            // after that, roughly every 2 days
const LINK_DAYS = 3;

export async function runSignupNudges() {
  const now = Date.now();
  const { data } = await db().from('businesses')
    .select('id, email, trading_name, contact_name, founding_member, subscription_status, free_listing, created_at, nudge_count, stuck_at, nudged_at')
    .eq('status', 'started').is('nudges_stopped_at', null)
    .limit(200);
  let sent = 0;
  for (const b of data ?? []) {
    const n = Number(b.nudge_count ?? 0);
    const ageHours = (now - new Date(b.created_at as string).getTime()) / 3_600_000;
    const lastSent = b.nudged_at ? (now - new Date(b.nudged_at as string).getTime()) / 3_600_000 : null;
    const due = n < STEPS_HOURS.length ? ageHours >= STEPS_HOURS[n] : (lastSent ?? 999) >= EVERY_HOURS;
    if (!due) continue;
    if (b.stuck_at) continue; // they have asked for help: a person follows up, not the robot
    const plan = planChosen(b);
    const page = plan ? `/account/${b.id}/details` : `/account/${b.id}/plan`;
    const token = await createLoginToken(b.email as string, LINK_DAYS * 24 * 60, 'nudge');
    const link = `${siteUrl()}/login/verify?token=${encodeURIComponent(token)}&next=${encodeURIComponent(page)}`;
    const stuckToken = await createLoginToken(b.email as string, 30 * 24 * 60, 'stuck');
    const stuck = `${siteUrl()}/stuck?b=${b.id}&t=${encodeURIComponent(stuckToken)}`;
    const stop = n + 1 >= 4 ? `${siteUrl()}/stuck?b=${b.id}&t=${encodeURIComponent(stuckToken)}&stop=1` : null;
    await emailSignupNudge(b.email as string, (b.contact_name as string) || '', b.trading_name as string, plan ? 'details' : 'plan', link, stuck, n + 1, stop);
    await db().from('businesses').update({ nudged_at: new Date().toISOString(), nudge_count: n + 1 }).eq('id', b.id);
    sent++;
  }
  // Rate limit records only matter for an hour
  await db().from('rate_events').delete().lt('created_at', new Date(now - 86_400_000).toISOString());
  return sent;
}
