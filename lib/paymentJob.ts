import 'server-only';
import { db } from './supabase';
import { isPaid } from './membership';
import { cleanJob, cleanApp, datesFor, appStatus, retentionFor } from './payments';
import { money, todayUK, ukDay, daysFrom } from './payDates';
import { emailPaymentAlerts, type PayAlert } from './email';

/** Daily: emails members about missed payment notices, final dates coming up, late payments and retentions due. */
export async function runPaymentReminders() {
  const today = todayUK();
  const { data: jobRows } = await db().from('pay_jobs').select('*').is('archived_at', null).limit(10000);
  const jobs = (jobRows ?? []).map(cleanJob);
  if (!jobs.length) return 0;
  const { data: appRows } = await db().from('pay_apps').select('*').in('job_id', jobs.map((j) => j.id)).limit(50000);
  const apps = (appRows ?? []).map(cleanApp);
  const bids = [...new Set(jobs.map((j) => j.business_id))];
  const { data: biz } = await db().from('businesses').select('id, email, contact_name, trading_name, status, founding_member, subscription_status').in('id', bids);
  const byId = new Map((biz ?? []).filter((b) => b.status === 'approved' && isPaid(b)).map((b) => [b.id as string, b]));

  const due: { bid: string; ref: string; kind: string; alert: PayAlert }[] = [];
  for (const j of jobs) {
    if (!byId.has(j.business_id)) continue;
    const base = { job: j.name, contractor: j.contractor, jobId: j.id };
    for (const a of apps.filter((x) => x.job_id === j.id && !x.paid_on)) {
      const d = datesFor(j, a);
      const s = appStatus(j, a, today);
      if (today > d.finalDate) {
        due.push({ bid: j.business_id, ref: a.id, kind: 'overdue', alert: { ...base, line: `application ${a.number} (${money(s.outstanding)}) was due by ${ukDay(d.finalDate)} and is unpaid. You can give notice of intention to suspend and claim late payment interest.` } });
      } else {
        const left = daysFrom(today, d.finalDate);
        if (left <= 2) due.push({ bid: j.business_id, ref: a.id, kind: 'final-soon', alert: { ...base, line: `final date for payment of application ${a.number} (${money(s.outstanding)}) is ${ukDay(d.finalDate)}.` } });
        if (!a.payment_notice_on && today > d.paymentNoticeBy) {
          due.push({ bid: j.business_id, ref: a.id, kind: 'pn-missed', alert: { ...base, line: `no payment notice recorded for application ${a.number} by ${ukDay(d.paymentNoticeBy)}. If you applied in line with the subcontract, the ${money(a.amount_applied)} you applied for is the sum due unless they send a pay less notice by ${ukDay(d.paylessBy)}.` } });
        }
      }
    }
    const ret = retentionFor(j, apps.filter((x) => x.job_id === j.id), today);
    if (ret) {
      if (ret.firstDue && !j.first_released_on && ret.firstOutstanding > 0 && today >= ret.firstDue) {
        const chase = daysFrom(ret.firstDue, today) >= 30;
        due.push({ bid: j.business_id, ref: j.id, kind: chase ? 'ret1-chase' : 'ret1-due', alert: { ...base, line: `${chase ? 'still waiting for' : 'due now:'} first half of retention, ${money(ret.firstOutstanding)} (practical completion ${ukDay(ret.firstDue)}).` } });
      }
      if (ret.secondDue && !j.second_released_on && ret.secondOutstanding > 0 && today >= ret.secondDue) {
        const chase = daysFrom(ret.secondDue, today) >= 30;
        due.push({ bid: j.business_id, ref: j.id, kind: chase ? 'ret2-chase' : 'ret2-due', alert: { ...base, line: `${chase ? 'still waiting for' : 'due now:'} balance of retention, ${money(ret.secondOutstanding)} (defects period ended ${ukDay(ret.secondDue)}).` } });
      }
    }
  }

  const perBiz = new Map<string, PayAlert[]>();
  for (const x of due) {
    const { data: fresh } = await db().from('pay_reminders').upsert({ ref_id: x.ref, kind: x.kind }, { onConflict: 'ref_id,kind', ignoreDuplicates: true }).select('ref_id');
    if (!fresh?.length) continue;
    perBiz.set(x.bid, [...(perBiz.get(x.bid) ?? []), x.alert]);
  }
  for (const [bid, items] of perBiz) {
    const b = byId.get(bid)!;
    await emailPaymentAlerts({ email: b.email, contactName: b.contact_name, tradingName: b.trading_name, businessId: bid }, items);
  }
  return perBiz.size;
}
