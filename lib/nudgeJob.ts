import 'server-only';
import { db } from './supabase';
import { siteUrl } from './config';
import { planChosen } from './membership';
import { emailSignupNudge } from './email';

/**
 * Once, about a day after someone starts signing up but does not finish, remind them where they got to:
 * choosing a plan (or finishing payment), or adding their details and sending them for approval.
 */
export async function runSignupNudges() {
  const now = Date.now();
  const { data } = await db().from('businesses')
    .select('id, email, trading_name, contact_name, founding_member, subscription_status, free_listing')
    .eq('status', 'started').is('nudged_at', null)
    .lt('created_at', new Date(now - 20 * 3_600_000).toISOString())
    .gt('created_at', new Date(now - 7 * 86_400_000).toISOString())
    .limit(200);
  let sent = 0;
  for (const b of data ?? []) {
    const plan = planChosen(b);
    const page = plan ? `/account/${b.id}/details` : `/account/${b.id}/plan`;
    await emailSignupNudge(b.email, b.contact_name || '', b.trading_name, plan ? 'details' : 'plan', `${siteUrl()}/login?next=${encodeURIComponent(page)}`);
    await db().from('businesses').update({ nudged_at: new Date().toISOString() }).eq('id', b.id);
    sent++;
  }
  // Rate limit records only matter for an hour
  await db().from('rate_events').delete().lt('created_at', new Date(now - 86_400_000).toISOString());
  return sent;
}
