import 'server-only';
import { db } from './supabase';
import { newInviteId, inviteToken, inviteLink, hashToken, qtyText, type QLine, type QRequest } from './quotes';
import { emailSupplierPriceRequest, type PriceRequestMail } from './email';

/** Creates a private link for each supplier and emails it. Shared with "send to more suppliers". */
export async function sendInvites(requestId: string, supplierIds: string[], mail: PriceRequestMail) {
  const { data: sups } = await db().from('suppliers').select('id, name, email').in('id', supplierIds);
  for (const s of sups ?? []) {
    if (!s.email) continue;
    const id = newInviteId();
    const { error } = await db().from('quote_invites').insert({ id, request_id: requestId, supplier_id: s.id, token_hash: hashToken(inviteToken(id)) });
    if (error) { console.error('quote invite failed', error); continue; }
    await emailSupplierPriceRequest(s.email, s.name, mail, inviteLink(id));
  }
}

/** The email summary for an existing request (used when sending it to more suppliers). */
export function requestMail(r: QRequest, tradingName: string, lines: QLine[]): PriceRequestMail {
  return {
    reference: r.reference, tradingName, area: r.area, lines: lines.length, closesAt: r.closes_at, neededBy: r.needed_by,
    summary: lines.slice(0, 6).map((l) => `${qtyText(l.qty)} ${l.unit === 'each' ? '' : `${l.unit} `}${l.item}${l.spec ? `, ${l.spec}` : ''}`),
  };
}
