import 'server-only';
import { db } from './supabase';
import { siteUrl } from './config';
import { inviteLink } from './quotes';
import { emailSupplierQuoteReminder, emailMemberQuotesClosed } from './email';

/**
 * Daily: remind suppliers who have not priced a request that closes within the next 30 hours,
 * and tell members when the deadline has passed.
 */
export async function runQuoteJob() {
  const now = Date.now();
  let reminders = 0; let closed = 0;

  const { data: soon } = await db().from('quote_requests').select('id, business_id, reference, closes_at')
    .eq('status', 'open').gt('closes_at', new Date(now).toISOString()).lte('closes_at', new Date(now + 30 * 3_600_000).toISOString());
  for (const r of soon ?? []) {
    const [{ data: invites }, { data: b }] = await Promise.all([
      db().from('quote_invites').select('id, supplier_id').eq('request_id', r.id).eq('status', 'invited').is('reminded_at', null),
      db().from('businesses').select('trading_name').eq('id', r.business_id).maybeSingle(),
    ]);
    if (!invites?.length) continue;
    const { data: sups } = await db().from('suppliers').select('id, name, email').in('id', invites.map((i) => i.supplier_id));
    for (const i of invites) {
      const s = sups?.find((x) => x.id === i.supplier_id);
      if (!s?.email) continue;
      await emailSupplierQuoteReminder(s.email, s.name, r.reference, b?.trading_name ?? 'A Little Green Book member', r.closes_at, inviteLink(i.id));
      await db().from('quote_invites').update({ reminded_at: new Date().toISOString() }).eq('id', i.id);
      reminders++;
    }
  }

  const { data: due } = await db().from('quote_requests').select('id, business_id, reference')
    .eq('status', 'open').eq('closed_emailed', false).lte('closes_at', new Date(now).toISOString());
  for (const r of due ?? []) {
    await db().from('quote_requests').update({ status: 'closed', closed_emailed: true }).eq('id', r.id);
    const [{ data: invites }, { data: b }] = await Promise.all([
      db().from('quote_invites').select('status').eq('request_id', r.id),
      db().from('businesses').select('id, email, contact_name').eq('id', r.business_id).maybeSingle(),
    ]);
    if (!b) continue;
    const quoted = (invites ?? []).filter((i) => i.status === 'quoted').length;
    await emailMemberQuotesClosed(b.email, b.contact_name, r.reference, quoted, (invites ?? []).length, `${siteUrl()}/account/${b.id}/quotes/${r.id}`);
    closed++;
  }
  return { reminders, closed };
}
