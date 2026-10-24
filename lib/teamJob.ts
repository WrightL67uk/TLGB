import 'server-only';
import { db } from './supabase';
import { isPaid } from './membership';
import { daysLeft, qualName } from './teamTypes';
import { emailTeamReminders, type TeamReminder } from './email';

/**
 * Daily: emails members about team cards and courses expiring in 60 days, 30 days, or
 * expired in the last month. Each stage is sent once per expiry date, recorded in team_reminders.
 */
export async function runTeamReminders() {
  const today = new Date();
  const from = new Date(today.getTime() - 30 * 86_400_000).toISOString().slice(0, 10);
  const to = new Date(today.getTime() + 60 * 86_400_000).toISOString().slice(0, 10);
  const { data: quals } = await db().from('team_quals')
    .select('id, business_id, person_id, qual_type, detail, expiry')
    .gte('expiry', from).lte('expiry', to).limit(20000);
  if (!quals?.length) return 0;

  const bids = [...new Set(quals.map((q) => q.business_id as string))];
  const pids = [...new Set(quals.map((q) => q.person_id as string))];
  const [{ data: businesses }, { data: people }] = await Promise.all([
    db().from('businesses').select('id, email, contact_name, trading_name, status, founding_member, subscription_status').in('id', bids),
    db().from('team_people').select('id, name').in('id', pids),
  ]);
  const biz = new Map((businesses ?? []).map((b) => [b.id as string, b]));
  const names = new Map((people ?? []).map((p) => [p.id as string, p.name as string]));

  const per = new Map<string, TeamReminder[]>();
  for (const q of quals) {
    const b = biz.get(q.business_id as string);
    if (!b || b.status !== 'approved' || !isPaid(b)) continue;
    const days = daysLeft(q.expiry as string);
    const kind = days < 0 ? 'expired' : days <= 30 ? '30d' : '60d';
    const { data: fresh } = await db().from('team_reminders')
      .upsert({ qual_id: q.id, kind, expiry: q.expiry }, { onConflict: 'qual_id,kind,expiry', ignoreDuplicates: true })
      .select('qual_id');
    if (!fresh?.length) continue;
    const list = per.get(b.id) ?? [];
    list.push({ person: names.get(q.person_id as string) ?? 'Team member', card: qualName({ qual_type: q.qual_type as string, detail: q.detail as string | null }), expiry: q.expiry as string, days });
    per.set(b.id, list);
  }

  for (const [id, items] of per) {
    const b = biz.get(id)!;
    items.sort((x, y) => x.days - y.days);
    await emailTeamReminders({ email: b.email, contactName: b.contact_name, tradingName: b.trading_name, businessId: id }, items);
  }
  return per.size;
}
