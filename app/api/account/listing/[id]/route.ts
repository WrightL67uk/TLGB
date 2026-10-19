import { cleanAccreditationExpiries, fmtDate } from '@/lib/expiries';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { ownedBusiness, flagForRecheck } from '@/lib/account';
import { lookupPostcode } from '@/lib/postcodes';
import { emailAdminChanges } from '@/lib/email';
import { ACCREDITATIONS, TRADES, TURNOVER_BANDS, gbp } from '@/lib/config';

export const runtime = 'nodejs';

const tradeSlugs = TRADES.map((t) => t.slug) as [string, ...string[]];
const bandKeys = TURNOVER_BANDS.map((b) => b.key) as [string, ...string[]];
const blank = (v: unknown) => (v === '' || v == null ? undefined : v);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a date');

const Schema = z.object({
  trading_name: z.string().trim().min(2).max(120),
  contact_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(30),
  website: z.preprocess(blank, z.string().trim().max(200).optional()),
  business_address: z.preprocess(blank, z.string().trim().max(300).optional()),
  description: z.preprocess(blank, z.string().trim().max(2000).optional()),
  base_postcode: z.string().trim().min(5).max(10),
  radius_miles: z.coerce.number().int().min(5).max(300),
  trades: z.array(z.enum(tradeSlugs)).min(1, 'Pick at least one trade'),
  accreditations: z.array(z.enum(ACCREDITATIONS)).default([]),
  accreditation_expiries: z.record(z.string(), z.string()).default({}),
  turnover_band: z.enum(bandKeys, { message: 'Choose your annual turnover' }),
  pl_cover_amount: z.coerce.number().int().positive(),
  pl_expiry: date,
  el_cover_amount: z.preprocess(blank, z.coerce.number().int().positive().optional()),
  el_expiry: z.preprocess(blank, date.optional()),
});

const LABEL: Record<string, string> = {
  trading_name: 'Trading name', contact_name: 'Contact name', phone: 'Phone', base_postcode: 'Base postcode',
  radius_miles: 'Coverage radius', trades: 'Trades', turnover_band: 'Turnover',
  pl_cover_amount: 'Public liability cover', pl_expiry: 'Public liability expiry', el_expiry: 'Employers liability expiry',
};

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
const squash = (pc: string) => pc.replace(/\s+/g, '').toUpperCase();

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return fail('Request blocked.', 403);
  const { id } = await params;
  const own = await ownedBusiness(id);
  if (!own.ok) return fail(own.error, own.status);
  const b = own.business;
  if (b.status === 'suspended') return fail('This listing is suspended. Contact us to sort it out.', 403);

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const key = String(issue.path[0] ?? '');
    return fail(`${LABEL[key] ?? 'Form'}: ${issue.message}`);
  }
  const d = parsed.data;

  if (b.business_type === 'sole_trader' && !d.business_address) return fail('Business address: sole traders must give one.');
  const today = new Date().toISOString().slice(0, 10);
  if (d.pl_expiry < today) return fail('Your public liability insurance has expired. Upload your new certificate and enter its expiry date.');
  // Past dates are allowed here so an expired accreditation doesn't block other edits; it just stops showing.
  const accExp = cleanAccreditationExpiries(d.accreditations, d.accreditation_expiries, { allowPast: true });
  if (!accExp.ok) return fail(accExp.error);

  // ---- Postcode: only look it up again if it changed
  let lat = b.lat, lng = b.lng, postcode = b.base_postcode;
  if (squash(d.base_postcode) !== squash(b.base_postcode)) {
    const pc = await lookupPostcode(d.base_postcode);
    if (!pc.ok) return fail(pc.reason);
    ({ lat, lng, postcode } = pc);
  }

  // ---- Changes that need an admin to look at them
  const changes: string[] = [];
  if (d.trading_name !== b.trading_name) changes.push(`Trading name changed to "${d.trading_name}"`);
  if (!sameSet(d.trades, b.trades)) changes.push('Trades changed');
  if (!sameSet(d.accreditations, b.accreditations)) changes.push('Accreditations changed');
  const oldExp = b.accreditation_expiries ?? {};
  const renewed = d.accreditations.filter((a) => accExp.value[a] && oldExp[a] && accExp.value[a] !== oldExp[a]);
  if (renewed.length) changes.push(`New expiry dates: ${renewed.map((a) => `${a} to ${fmtDate(accExp.value[a])}`).join(', ')}`);
  const plChanged = d.pl_cover_amount !== b.pl_cover_amount || d.pl_expiry !== b.pl_expiry;
  if (plChanged) changes.push(`Public liability now ${gbp(d.pl_cover_amount)} to ${new Date(d.pl_expiry).toLocaleDateString('en-GB')}`);
  if ((d.el_cover_amount ?? null) !== b.el_cover_amount || (d.el_expiry ?? null) !== b.el_expiry) changes.push('Employers liability changed');
  if (d.turnover_band !== b.turnover_band) changes.push('Turnover band changed');
  if (b.business_type === 'sole_trader' && (d.business_address ?? null) !== b.business_address) changes.push('Business address changed');

  // New insurance figures must come with a new certificate, uploaded in the last few hours
  if (plChanged) {
    const since = new Date(Date.now() - 3 * 3_600_000).toISOString();
    const { count } = await db()
      .from('business_documents')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', b.id)
      .eq('doc_type', 'public_liability')
      .gte('created_at', since);
    if (!count) return fail('Upload your new public liability certificate first (Documents section), then change the cover or expiry date.');
  }

  const { error } = await db()
    .from('businesses')
    .update({
      trading_name: d.trading_name,
      contact_name: d.contact_name,
      phone: d.phone,
      website: d.website ?? null,
      business_address: d.business_address ?? null,
      description: d.description ?? null,
      base_postcode: postcode,
      lat,
      lng,
      radius_miles: d.radius_miles,
      trades: d.trades,
      accreditations: d.accreditations,
      accreditation_expiries: accExp.value,
      turnover_band: d.turnover_band,
      pl_cover_amount: d.pl_cover_amount,
      pl_expiry: d.pl_expiry,
      el_cover_amount: d.el_cover_amount ?? null,
      el_expiry: d.el_expiry ?? null,
    })
    .eq('id', b.id);
  if (error) {
    console.error('account save failed', error);
    return fail('Could not save your changes. Try again.', 500);
  }

  // A rejected listing goes back into the queue once the trade has updated it
  if (b.status === 'rejected') {
    await db().from('businesses').update({ status: 'pending_review' }).eq('id', b.id);
    await db().from('review_events').insert({ business_id: b.id, action: 'resubmitted', actor: own.email, detail: changes.join('; ') || null });
    await emailAdminChanges({ id: b.id, tradingName: d.trading_name }, 'resubmitted', changes.join('; ') || 'Details updated');
    return NextResponse.json({ ok: true, outcome: 'resubmitted' });
  }

  await flagForRecheck({ ...b, trading_name: d.trading_name }, changes, own.email);
  return NextResponse.json({ ok: true, outcome: b.status === 'approved' && changes.length ? 'recheck' : 'saved' });
}
