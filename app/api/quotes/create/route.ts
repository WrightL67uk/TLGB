import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { ownedBusiness } from '@/lib/account';
import { isPaid } from '@/lib/membership';
import { sameOrigin } from '@/lib/session';
import { lookupPostcode } from '@/lib/postcodes';
import { matchSuppliers, MAX_SUPPLIERS, qtyText } from '@/lib/quotes';
import { sendInvites } from '@/lib/quoteSend';
import { QUOTE_CATEGORIES, ALL_UNITS, ROOT_TYPES, PLANTS, MATERIAL_SPECS } from '@/lib/quoteTypes';
import { emailAdminNewPriceRequest, emailAdminPriceRequestShort } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const blank = (v: unknown) => (v === '' || v == null ? undefined : v);
const Line = z.object({
  category: z.enum(QUOTE_CATEGORIES.map((c) => c.key) as [string, ...string[]]),
  item: z.string().trim().min(2, 'Every line needs an item').max(120),
  spec: z.preprocess(blank, z.string().trim().max(80).optional()),
  root: z.preprocess(blank, z.enum(ROOT_TYPES.map((r) => r.key) as [string, ...string[]]).optional()),
  qty: z.coerce.number().positive('Every line needs a quantity').max(1_000_000),
  unit: z.enum(ALL_UNITS as [string, ...string[]]),
  notes: z.preprocess(blank, z.string().trim().max(200).optional()),
});
const Schema = z.object({
  businessId: z.string().uuid(),
  reference: z.string().trim().min(2, 'Add a reference, such as the job name').max(80),
  postcode: z.string().trim().min(2, 'Add the delivery postcode').max(10),
  neededBy: z.preprocess(blank, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  closesOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick the date you want prices by'),
  deliveryNotes: z.preprocess(blank, z.string().trim().max(1000).optional()),
  lines: z.array(Line).min(1, 'Add at least one item').max(150, 'Up to 150 items per request'),
  suppliers: z.array(z.string().uuid()).min(1, 'Tick at least one supplier').max(MAX_SUPPLIERS, `Pick up to ${MAX_SUPPLIERS} suppliers`),
});

/** 5pm UK time on the given date, as an ISO timestamp. */
function fivePmLondon(day: string) {
  const guess = new Date(`${day}T17:00:00Z`);
  const londonHour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: 'numeric', hourCycle: 'h23' }).format(guess));
  return new Date(guess.getTime() - (londonHour - 17) * 3_600_000).toISOString();
}

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const known = new Set([...PLANTS, ...MATERIAL_SPECS].map((s) => s.toLowerCase()));

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail('Please use the form on our website.', 403);
  const p = Schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail(p.error.issues[0]?.message ?? 'Please check the form.');
  const d = p.data;
  const own = await ownedBusiness(d.businessId);
  if (!own.ok) return fail(own.error, own.status);
  const b = own.business;
  if (!isPaid(b)) return fail('Price requests are included with paid membership.', 403);

  const today = new Date().toISOString().slice(0, 10);
  const maxClose = new Date(Date.now() + 21 * 86_400_000).toISOString().slice(0, 10);
  if (d.closesOn < today || d.closesOn > maxClose) return fail('Pick a "prices wanted by" date in the next three weeks.');
  const closesAt = fivePmLondon(d.closesOn);
  if (new Date(closesAt).getTime() < Date.now() + 3 * 3_600_000) return fail('Give suppliers at least a few hours. Pick a later "prices wanted by" date.');
  if (d.neededBy && d.neededBy < today) return fail('The "needed by" date is in the past.');

  // Limit requests so suppliers are not flooded: 10 a day per member.
  const { count } = await db().from('quote_requests').select('id', { count: 'exact', head: true })
    .eq('business_id', b.id).gte('created_at', new Date(Date.now() - 86_400_000).toISOString());
  if ((count ?? 0) >= 10) return fail('You have sent 10 price requests today. Please try again tomorrow.', 429);

  const pc = await lookupPostcode(d.postcode);
  if (!pc.ok) return fail(pc.reason);
  const categories = Array.from(new Set(d.lines.map((l) => l.category)));
  const matches = await matchSuppliers(categories, pc.lat, pc.lng);
  const chosen = matches.filter((m) => d.suppliers.includes(m.id));
  if (!chosen.length) return fail('None of the ticked suppliers cover this list and postcode. Check the list and try again.');

  const area = pc.postcode.split(' ')[0];
  const { data: reqRow, error } = await db().from('quote_requests').insert({
    business_id: b.id, email: own.email, reference: d.reference, postcode: pc.postcode, area, lat: pc.lat, lng: pc.lng,
    needed_by: d.neededBy ?? null, delivery_notes: d.deliveryNotes ?? null, closes_at: closesAt,
  }).select('id').single();
  if (error || !reqRow) {
    console.error('quote request save failed', error);
    return fail('Something went wrong saving your request. Please try again.', 500);
  }
  const { error: lineErr } = await db().from('quote_lines').insert(d.lines.map((l, i) => ({
    request_id: reqRow.id, position: i + 1, category: l.category, item: l.item, spec: l.spec ?? null, root: l.root ?? null,
    qty: l.qty, unit: l.unit, notes: l.notes ?? null, listed: known.has(l.item.toLowerCase()),
  })));
  if (lineErr) {
    console.error('quote lines save failed', lineErr);
    await db().from('quote_requests').delete().eq('id', reqRow.id);
    return fail('Something went wrong saving your list. Please try again.', 500);
  }

  const summary = d.lines.slice(0, 6).map((l) => `${qtyText(l.qty)} ${l.unit === 'each' ? '' : `${l.unit} `}${l.item}${l.spec ? `, ${l.spec}` : ''}`);
  await sendInvites(reqRow.id, chosen.map((c) => c.id), {
    reference: d.reference, tradingName: b.trading_name, area, lines: d.lines.length, closesAt, neededBy: d.neededBy ?? null, summary,
  });
  await emailAdminNewPriceRequest({ reference: d.reference, tradingName: b.trading_name, lines: d.lines.length, suppliers: chosen.map((c) => c.name) });
  if (matches.length < 3) await emailAdminPriceRequestShort({ reference: d.reference, tradingName: b.trading_name, categories, postcode: pc.postcode, found: matches.length });
  return NextResponse.json({ ok: true, next: `/account/${b.id}/quotes/${reqRow.id}?sent=1` });
}
