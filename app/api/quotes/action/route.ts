import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { ownedBusiness } from '@/lib/account';
import { isPaid } from '@/lib/membership';
import { sameOrigin } from '@/lib/session';
import { cleanLine, inviteLink, matchSuppliers, MAX_SUPPLIERS, type QRequest } from '@/lib/quotes';
import { sendInvites, requestMail } from '@/lib/quoteSend';
import { emailSupplierWon, emailSupplierLost } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const isId = (s: unknown): s is string => typeof s === 'string' && /^[0-9a-f-]{36}$/i.test(s);

/** Member actions on one of their estimate requests: accept a quote, close it, rate the supplier, send to more suppliers. */
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const bid = fd?.get('business_id');
  const rid = fd?.get('request_id');
  const action = String(fd?.get('action') ?? '');
  if (!fd || !isId(bid) || !isId(rid)) return NextResponse.redirect(new URL('/account', req.url), 303);
  const page = `/account/${bid}/quotes/${rid}`;
  const back = (q: string) => NextResponse.redirect(new URL(`${page}?${q}`, req.url), 303);
  const err = (m: string) => back('error=' + encodeURIComponent(m));
  if (!sameOrigin(req)) return err('Please use the buttons on our website.');

  const own = await ownedBusiness(bid);
  if (!own.ok) return NextResponse.redirect(new URL(own.status === 401 ? `/login?next=${page}` : '/account', req.url), 303);
  const b = own.business;
  const { data: r } = await db().from('quote_requests').select('*').eq('id', rid).eq('business_id', bid).maybeSingle();
  if (!r) return NextResponse.redirect(new URL(`/account/${bid}/quotes`, req.url), 303);
  const request = r as QRequest;

  if (action === 'accept') {
    const iid = fd.get('invite_id');
    if (!isId(iid)) return err('Pick a quote to accept.');
    if (request.status === 'accepted' || request.status === 'cancelled') return err('This request is already finished.');
    const { data: invites } = await db().from('quote_invites').select('id, supplier_id, status').eq('request_id', rid);
    const win = invites?.find((i) => i.id === iid && i.status === 'quoted');
    if (!win) return err('That quote is not available to accept.');
    await db().from('quote_requests').update({ status: 'accepted', accepted_invite: iid }).eq('id', rid);
    await db().from('quote_invites').update({ status: 'won' }).eq('id', iid);
    const losers = (invites ?? []).filter((i) => i.id !== iid && i.status === 'quoted');
    if (losers.length) await db().from('quote_invites').update({ status: 'lost' }).in('id', losers.map((l) => l.id));
    const { data: sups } = await db().from('suppliers').select('id, name, email').in('id', (invites ?? []).map((i) => i.supplier_id));
    const sup = (id: string) => sups?.find((s) => s.id === id);
    const w = sup(win.supplier_id);
    if (w?.email) {
      await emailSupplierWon(w.email, w.name, request.reference, {
        tradingName: b.trading_name, contactName: b.contact_name, email: b.email, phone: b.phone ?? null,
        deliveryPostcode: request.postcode, neededBy: request.needed_by, deliveryNotes: request.delivery_notes,
      }, inviteLink(iid));
    }
    for (const l of losers) {
      const s = sup(l.supplier_id);
      if (s?.email) await emailSupplierLost(s.email, s.name, request.reference, b.trading_name);
    }
    return back('accepted=1');
  }

  if (action === 'cancel') {
    if (request.status === 'accepted' || request.status === 'cancelled') return err('This request is already finished.');
    await db().from('quote_requests').update({ status: 'cancelled' }).eq('id', rid);
    return back('cancelled=1');
  }

  if (action === 'rate') {
    if (request.status !== 'accepted' || !request.accepted_invite) return err('You can rate a supplier once you have accepted their quote.');
    const stars = Number(fd.get('stars'));
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) return err('Pick between 1 and 5 stars.');
    const comment = String(fd.get('comment') ?? '').trim().slice(0, 600) || null;
    const { data: inv } = await db().from('quote_invites').select('supplier_id').eq('id', request.accepted_invite).maybeSingle();
    if (!inv) return err('Supplier not found.');
    const { error } = await db().from('supplier_ratings').upsert(
      { supplier_id: inv.supplier_id, request_id: rid, business_id: bid, stars, comment, created_at: new Date().toISOString() },
      { onConflict: 'request_id' }
    );
    if (error) { console.error('rating save failed', error); return err('Something went wrong saving your rating.'); }
    return back('rated=1');
  }

  if (action === 'more') {
    if (!isPaid(b)) return err('Estimates are included with paid membership.');
    if (request.status !== 'open' && request.status !== 'closed') return err('This request is finished.');
    const ids = fd.getAll('supplier').map(String).filter(isId);
    if (!ids.length) return err('Tick at least one more supplier.');
    const [{ data: lines }, { data: invites }] = await Promise.all([
      db().from('quote_lines').select('*').eq('request_id', rid).order('position'),
      db().from('quote_invites').select('supplier_id').eq('request_id', rid),
    ]);
    const already = new Set((invites ?? []).map((i) => i.supplier_id));
    const room = MAX_SUPPLIERS + 4 - already.size;
    const clean = (lines ?? []).map(cleanLine);
    const matches = await matchSuppliers(Array.from(new Set(clean.map((l) => l.category))), Number(r.lat), Number(r.lng));
    const pick = matches.filter((m) => ids.includes(m.id) && !already.has(m.id)).slice(0, Math.max(0, room)).map((m) => m.id);
    if (!pick.length) return err('No more suppliers can be added to this request.');
    // Reopen with a new deadline if the old one has passed: two working days from now.
    let closes = request.closes_at;
    if (new Date(closes) < new Date(Date.now() + 24 * 3_600_000)) {
      closes = new Date(Date.now() + 2 * 86_400_000).toISOString();
      await db().from('quote_requests').update({ status: 'open', closes_at: closes, closed_emailed: false }).eq('id', rid);
    }
    await sendInvites(rid, pick, requestMail({ ...request, closes_at: closes }, b.trading_name, clean));
    return back(`more=${pick.length}`);
  }

  return err('Unknown action.');
}
