import 'server-only';
import { db } from './supabase';
import { isPaid } from './membership';
import { docType, daysTo } from './complianceTypes';
import { archiveDocs } from './compliance';
import { emailPackReminders, emailPqqFigures, type PackReminder } from './email';
import { FIGURE_KEYS } from './pqq';

/**
 * Daily: emails members about pack documents expiring in 30 days, 7 days or already
 * expired, and own documents not reviewed for a year. Each reminder is sent once,
 * recorded in compliance_reminders. Insurance already covered by the listing's own
 * expiry email (same date) is skipped so nobody gets two emails about one policy.
 */
export async function runComplianceReminders() {
  const { data: docs } = await db()
    .from('compliance_docs')
    .select('id, business_id, doc_type, title, expiry, reviewed_on, status')
    .is('archived_at', null)
    .in('status', ['checked', 'provided'])
    .limit(20000);
  if (!docs?.length) return 0;

  const due: { doc: (typeof docs)[number]; kind: PackReminder['kind']; date: string; days: number; key: string }[] = [];
  for (const d of docs) {
    if (d.expiry) {
      const days = daysTo(d.expiry);
      const kind = days < 0 ? 'expired' : days <= 7 ? 'exp7' : days <= 30 ? 'exp30' : null;
      if (kind && days >= -30) due.push({ doc: d, kind, date: d.expiry, days, key: kind });
    } else if (d.reviewed_on && !docType(d.doc_type)?.expires && daysTo(d.reviewed_on) < -365) {
      // Keyed on the review date, so reviewing again restarts the clock
      due.push({ doc: d, kind: 'review', date: d.reviewed_on, days: 0, key: `review-${d.reviewed_on}` });
    }
  }
  if (!due.length) return 0;

  const ids = [...new Set(due.map((x) => x.doc.business_id))];
  const [{ data: businesses }, { data: links }] = await Promise.all([
    db().from('businesses').select('id, email, contact_name, trading_name, status, founding_member, subscription_status, pl_expiry, el_expiry').in('id', ids),
    db().from('pack_links').select('business_id, include, expires_at').in('business_id', ids).is('revoked_at', null),
  ]);
  const byId = new Map((businesses ?? []).map((b) => [b.id as string, b]));

  const perBusiness = new Map<string, PackReminder[]>();
  for (const x of due) {
    const b = byId.get(x.doc.business_id);
    if (!b || !isPaid(b)) continue;
    if (x.kind !== 'review' && ((x.doc.doc_type === 'pl' && b.pl_expiry === x.date) || (x.doc.doc_type === 'el' && b.el_expiry === x.date))) continue;

    // Record first; if it was already there, this reminder has been sent before
    const { data: fresh } = await db().from('compliance_reminders')
      .upsert({ doc_id: x.doc.id, kind: x.key }, { onConflict: 'doc_id,kind', ignoreDuplicates: true })
      .select('doc_id');
    if (!fresh?.length) continue;

    const cat = docType(x.doc.doc_type)?.category;
    const liveLinks = (links ?? []).filter((l) => l.business_id === b.id && (!l.expires_at || new Date(l.expires_at) > new Date()) && cat && (l.include as string[]).includes(cat)).length;
    const list = perBusiness.get(b.id) ?? [];
    list.push({ title: x.doc.title, kind: x.kind, date: x.date, days: x.days, links: liveLinks });
    perBusiness.set(b.id, list);
  }

  for (const [id, items] of perBusiness) {
    const b = byId.get(id)!;
    await emailPackReminders({ email: b.email, contactName: b.contact_name, tradingName: b.trading_name, businessId: id }, items);
  }
  return perBusiness.size;
}

/** Daily: a yearly nudge to update turnover and accident figures saved more than a year ago. */
export async function runPqqReminders() {
  const cutoff = new Date(Date.now() - 365 * 86_400_000).toISOString();
  const { data: stale } = await db().from('pqq_answers').select('business_id, updated_at').in('key', FIGURE_KEYS).lt('updated_at', cutoff).limit(5000);
  const ids = [...new Set((stale ?? []).map((r) => r.business_id as string))];
  if (!ids.length) return 0;
  const { data: businesses } = await db().from('businesses')
    .select('id, email, contact_name, trading_name, status, founding_member, subscription_status').in('id', ids);
  let sent = 0;
  const period = String(new Date().getFullYear());
  for (const b of businesses ?? []) {
    if (!isPaid(b)) continue;
    const { data: fresh } = await db().from('pqq_reminders')
      .upsert({ business_id: b.id, period }, { onConflict: 'business_id,period', ignoreDuplicates: true }).select('business_id');
    if (!fresh?.length) continue;
    await emailPqqFigures({ email: b.email, contactName: b.contact_name, tradingName: b.trading_name, businessId: b.id });
    sent++;
  }
  return sent;
}

/**
 * Daily tidy-up that keeps the privacy notice true:
 *  - compliance pack files and team training records are deleted 90 days after a paid membership ends
 *  - contractor jobs (with drawings and replies) are deleted 2 years after they close
 *  - used or expired login links and sessions are removed
 */
export async function runDataCleanup() {
  const now = Date.now();
  const ago = (days: number) => new Date(now - days * 86_400_000).toISOString();
  const out: Record<string, number> = {};

  // Lapsed members' packs
  const { data: lapsed } = await db().from('businesses')
    .select('id, status, founding_member, subscription_status, paid_until')
    .eq('founding_member', false).in('subscription_status', ['cancelled', 'none']).lt('paid_until', ago(90)).limit(500);
  let docs = 0;
  for (const b of lapsed ?? []) {
    if (isPaid(b)) continue;
    const { data: rows } = await db().from('compliance_docs').select('id').eq('business_id', b.id).is('archived_at', null);
    if (rows?.length) {
      await archiveDocs(rows.map((r) => r.id as string));
      docs += rows.length;
    }
    await db().from('team_people').delete().eq('business_id', b.id);
  }
  out.packFilesDeleted = docs;

  // Payment tracker records two years after a membership ends
  const { data: longGone } = await db().from('businesses').select('id')
    .eq('founding_member', false).in('subscription_status', ['cancelled', 'none']).lt('paid_until', ago(730)).limit(500);
  if (longGone?.length) {
    const { count } = await db().from('pay_jobs').delete({ count: 'exact' }).in('business_id', longGone.map((b) => b.id));
    out.payJobsDeleted = count ?? 0;
  }

  // Old contractor jobs
  const { data: oldJobs } = await db().from('contractor_jobs').select('id').in('status', ['closed', 'removed', 'open', 'draft']).lt('updated_at', ago(730)).limit(200);
  for (const j of oldJobs ?? []) {
    const { data: files } = await db().from('contractor_job_files').select('storage_path').eq('job_id', j.id);
    if (files?.length) await db().storage.from('contractor-jobs').remove(files.map((f) => f.storage_path as string));
    await db().from('contractor_jobs').delete().eq('id', j.id);
  }
  out.oldJobsDeleted = oldJobs?.length ?? 0;

  // Login links and sessions
  await db().from('login_tokens').delete().lt('expires_at', ago(1));
  await db().from('sessions').delete().lt('expires_at', ago(1));
  return out;
}
