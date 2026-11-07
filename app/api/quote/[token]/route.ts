import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { siteUrl } from '@/lib/config';
import { loadInviteByToken, goodsTotal, isOpen, type QPrice } from '@/lib/quotes';
import { emailMemberQuoteIn } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const money = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '').replace(/[£,\s]/g, '');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n < 10_000_000 ? Math.round(n * 100) / 100 : NaN;
};
const text = (v: FormDataEntryValue | null, max: number) => String(v ?? '').trim().slice(0, max) || null;

/** A supplier saving prices (or saying they cannot quote) through their private link. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const page = `/quote/${encodeURIComponent(token)}`;
  const wantsJson = (req.headers.get('accept') ?? '').includes('application/json');
  const back = (q: string) => (wantsJson ? NextResponse.json({ ok: true, next: `${page}?${q}` }) : NextResponse.redirect(new URL(`${page}?${q}`, req.url), 303));
  const err = (m: string) => (wantsJson ? NextResponse.json({ ok: false, error: m }, { status: 400 }) : back('error=' + encodeURIComponent(m)));
  if (!sameOrigin(req)) return err('Please use the form on our website.');
  const fd = await req.formData().catch(() => null);
  if (!fd) return err('Something went wrong. Please try again.');
  const v = await loadInviteByToken(token);
  if (!v || v.expired) return err('This link has expired.');
  const { invite, request, lines } = v;
  if (!isOpen(request)) return err('The deadline for this request has passed, so prices can no longer be changed.');
  if (invite.status === 'won' || invite.status === 'lost') return err('This request has already been decided.');

  if (fd.get('action') === 'decline') {
    await db().from('quote_invites').update({ status: 'declined', decline_reason: text(fd.get('decline_reason'), 300) }).eq('id', invite.id);
    return back('declined=1');
  }
  if (fd.get('action') === 'undecline') {
    await db().from('quote_invites').update({ status: invite.quoted_at ? 'quoted' : 'invited', decline_reason: null }).eq('id', invite.id);
    return back('');
  }

  const prices: QPrice[] = [];
  for (const l of lines) {
    const available = String(fd.get(`avail_${l.id}`) ?? 'yes');
    const avail = (['yes', 'no', 'sub'].includes(available) ? available : 'yes') as QPrice['available'];
    const unit = money(fd.get(`price_${l.id}`));
    if (Number.isNaN(unit)) return err(`The price for "${l.item}" does not look right. Enter a number, such as 12.50.`);
    const substitute = text(fd.get(`sub_${l.id}`), 160);
    if (avail === 'sub' && !substitute) return err(`Say what you would supply instead of "${l.item}".`);
    if (avail !== 'no' && unit == null) return err(`Add a price for "${l.item}", or mark it as not available.`);
    prices.push({ invite_id: invite.id, line_id: l.id, available: avail, unit_price: avail === 'no' ? null : unit, substitute: avail === 'sub' ? substitute : null, note: text(fd.get(`note_${l.id}`), 200) });
  }
  if (!prices.some((p) => p.available !== 'no')) return err('Every item is marked as not available. If you cannot supply any of it, press "We cannot quote" instead.');
  const delivery = money(fd.get('delivery_charge'));
  if (delivery == null || Number.isNaN(delivery)) return err('Add a delivery charge (enter 0 if delivery is free).');
  const leadRaw = String(fd.get('lead_days') ?? '').trim();
  const lead = leadRaw ? Number(leadRaw) : null;
  if (lead != null && (!Number.isInteger(lead) || lead < 0 || lead > 365)) return err('Lead time should be a number of working days.');
  const validUntil = String(fd.get('valid_until') ?? '');
  if (validUntil && !/^\d{4}-\d{2}-\d{2}$/.test(validUntil)) return err('Check the "prices valid until" date.');

  const { error } = await db().from('quote_prices').upsert(prices, { onConflict: 'invite_id,line_id' });
  if (error) { console.error('quote prices save failed', error); return err('Something went wrong saving your prices. Please try again.'); }
  const firstTime = !invite.quoted_at;
  await db().from('quote_invites').update({
    status: 'quoted', quoted_at: new Date().toISOString(), goods_total: goodsTotal(lines, prices).total,
    delivery_charge: delivery, lead_days: lead, valid_until: validUntil || null, notes: text(fd.get('notes'), 1000), decline_reason: null,
  }).eq('id', invite.id);

  if (firstTime) {
    const [{ data: b }, { data: all }] = await Promise.all([
      db().from('businesses').select('id, email, contact_name').eq('id', request.business_id).maybeSingle(),
      db().from('quote_invites').select('status').eq('request_id', request.id),
    ]);
    if (b) {
      const quoted = (all ?? []).filter((i) => i.status === 'quoted').length;
      await emailMemberQuoteIn(b.email, b.contact_name, request.reference, v.supplier.name, quoted, (all ?? []).length, `${siteUrl()}/account/${b.id}/quotes/${request.id}`);
    }
  }
  return back('saved=1');
}
