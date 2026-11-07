import 'server-only';
import { db } from './supabase';
import { isPaid } from './membership';
import { MEMBER_PLANS } from './plans';
import { emailProEnding } from './email';

/**
 * Daily: members on free Pro from a code get an email 60 days and 30 days before it ends,
 * unless they have already chosen to keep Pro. pro_reminder records the last one sent.
 */
export async function runProReminders() {
  const now = Date.now();
  const soon = new Date(now + 60 * 86_400_000).toISOString();
  const { data } = await db().from('businesses')
    .select('id, email, contact_name, trading_name, status, founding_member, subscription_status, plan, pro_until, pro_reminder')
    .neq('plan', 'pro')
    .gt('pro_until', new Date(now).toISOString())
    .lte('pro_until', soon)
    .lt('pro_reminder', 30)
    .limit(500);
  if (!data?.length) return 0;

  const { count: leads } = await db().from('leads').select('id', { count: 'exact', head: true })
    .gte('created_at', new Date(now - 90 * 86_400_000).toISOString());

  let sent = 0;
  for (const b of data) {
    if (!isPaid(b) || b.founding_member || b.subscription_status === 'past_due') continue;
    const days = Math.ceil((new Date(b.pro_until as string).getTime() - now) / 86_400_000);
    const stage = days <= 30 ? 30 : 60;
    if (b.pro_reminder !== 0 && stage >= b.pro_reminder) continue; // this stage already sent
    try {
      await emailProEnding(
        { email: b.email, contactName: b.contact_name, tradingName: b.trading_name, businessId: b.id },
        b.pro_until as string, days,
        { verified: MEMBER_PLANS.verified.price, pro: MEMBER_PLANS.pro.price },
        leads ?? 0,
      );
      await db().from('businesses').update({ pro_reminder: stage }).eq('id', b.id);
      sent++;
    } catch (err) {
      console.error('pro reminder failed', b.id, err);
    }
  }
  return sent;
}
