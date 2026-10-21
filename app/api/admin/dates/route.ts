import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { ACCREDITATIONS, accreditationLabel } from '@/lib/config';
import { needsExpiry, fmtDate } from '@/lib/expiries';

export const runtime = 'nodejs';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function actorFrom(req: NextRequest) {
  const h = req.headers.get('authorization') ?? '';
  try { return atob(h.replace(/^Basic /, '')).split(':')[0] || 'admin'; } catch { return 'admin'; }
}

/**
 * Admin confirms insurance and accreditation dates after checking the certificates.
 * These become the dates that count; anything the trade entered that was waiting is cleared.
 * Behind the admin password (middleware).
 */
export async function POST(req: NextRequest) {
  const fd = await req.formData();
  const id = String(fd.get('id') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse('Bad id', { status: 400 });
  const back = (msg?: string) => NextResponse.redirect(new URL(`/admin/${id}${msg ? `?error=${encodeURIComponent(msg)}` : '?done=1'}`, req.url), 303);

  const plCover = Number(fd.get('pl_cover'));
  const plExpiry = String(fd.get('pl_expiry') ?? '');
  if (!plCover || !DATE.test(plExpiry)) return back('Public liability needs a cover amount and expiry date.');
  const elCoverRaw = String(fd.get('el_cover') ?? '').trim();
  const elExpiryRaw = String(fd.get('el_expiry') ?? '').trim();
  const elCover = elCoverRaw ? Number(elCoverRaw) : null;
  const elExpiry = elExpiryRaw || null;
  if (elCover && (!elExpiry || !DATE.test(elExpiry))) return back('Employers liability needs an expiry date, or clear the cover amount.');

  const accs = fd.getAll('acc').map(String).filter((a) => (ACCREDITATIONS as readonly string[]).includes(a));
  const expiries: Record<string, string> = {};
  for (const a of accs) {
    const v = String(fd.get(`acc_exp__${a}`) ?? '').trim();
    if (v && !DATE.test(v)) return back(`${accreditationLabel(a)}: enter a valid date.`);
    if (!v && needsExpiry(a)) return back(`${accreditationLabel(a)}: enter the expiry date from the certificate, or untick it.`);
    if (v) expiries[a] = v;
  }

  const update: Record<string, unknown> = {
    pl_cover_amount: plCover,
    pl_expiry: plExpiry,
    el_cover_amount: elCover,
    el_expiry: elCover ? elExpiry : null,
    accreditations: accs,
    accreditation_expiries: expiries,
    pending_dates: {},
  };
  if (fd.get('clear_recheck') === 'on') Object.assign(update, { recheck_required: false, recheck_reason: null });

  const { error } = await db().from('businesses').update(update).eq('id', id);
  if (error) {
    console.error('confirm dates failed', error);
    return back('Could not save. Try again.');
  }
  const summary = [
    `Public liability to ${fmtDate(plExpiry)}`,
    elCover ? `Employers liability to ${fmtDate(elExpiry!)}` : 'No employers liability',
    ...accs.map((a) => `${accreditationLabel(a)}${expiries[a] ? ` to ${fmtDate(expiries[a])}` : ''}`),
  ].join('; ');
  await db().from('review_events').insert({ business_id: id, action: 'rechecked', actor: actorFrom(req), detail: `Dates confirmed: ${summary}` });
  return back();
}
