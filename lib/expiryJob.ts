import 'server-only';
import { db } from './supabase';
import { expiryItems, daysUntil, stageFor, type Expiries } from './expiries';
import { emailTradeExpiries, emailAdminExpiries, type ExpiryNotice } from './email';

/**
 * For every approved listing, looks at insurance and accreditation expiry dates and
 * sends a flag at 30 days, 7 days and on expiry. Each flag is recorded in
 * expiry_notices, so running this twice never sends twice, and a renewal (new date)
 * starts the reminders afresh. Returns how many listings were flagged.
 */
export async function runExpiryJob(): Promise<number> {
  const { data: list, error } = await db()
    .from('businesses')
    .select('id, trading_name, contact_name, email, pl_expiry, el_expiry, el_cover_amount, accreditations, accreditation_expiries')
    .eq('status', 'approved')
    .limit(5000);
  if (error) throw new Error(`expiry job: load failed: ${error.message}`);

  const adminRows: { id: string; tradingName: string; items: ExpiryNotice[] }[] = [];

  for (const b of list ?? []) {
    const due = expiryItems({ ...b, accreditation_expiries: b.accreditation_expiries as Expiries })
      .map((i) => {
        const days = daysUntil(i.expiry);
        return { ...i, days, stage: stageFor(days) };
      })
      .filter((i): i is typeof i & { stage: NonNullable<typeof i.stage> } => i.stage !== null);
    if (!due.length) continue;

    // Record what we are about to send. Only rows that are new come back, so nothing repeats.
    const { data: fresh, error: insErr } = await db()
      .from('expiry_notices')
      .upsert(
        due.map((i) => ({ business_id: b.id, item: i.key, expiry: i.expiry, stage: i.stage })),
        { onConflict: 'business_id,item,expiry,stage', ignoreDuplicates: true }
      )
      .select('item, expiry, stage');
    if (insErr) {
      console.error('expiry job: record failed', b.id, insErr);
      continue;
    }
    if (!fresh?.length) continue;

    const items: ExpiryNotice[] = due
      .filter((i) => fresh.some((f) => f.item === i.key && f.expiry === i.expiry && f.stage === i.stage))
      .map((i) => ({ label: i.label, expiry: i.expiry, stage: i.stage, days: i.days }));

    await emailTradeExpiries({ id: b.id, email: b.email, contactName: b.contact_name, tradingName: b.trading_name }, items);
    await db().from('review_events').insert({
      business_id: b.id,
      action: 'note',
      actor: 'system',
      detail: `Expiry flag: ${items.map((i) => `${i.label} ${i.stage === 'expired' ? 'expired' : `due in ${i.days} days`}`).join('; ')}`,
    });
    adminRows.push({ id: b.id, tradingName: b.trading_name, items });
  }

  await emailAdminExpiries(adminRows);
  return adminRows.length;
}
