import 'server-only';
import { db } from './supabase';
import { isPaid } from './membership';
import { docType, daysTo } from './complianceTypes';
import { emailPackReminders, type PackReminder } from './email';

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
