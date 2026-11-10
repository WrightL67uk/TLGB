import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { db } from '@/lib/supabase';
import { getSessionEmail, sameOrigin } from '@/lib/session';
import { employerAccess } from '@/lib/seekers';
import { lookupPostcode } from '@/lib/postcodes';
import { LEVELS, SKILLS } from '@/lib/seekerTypes';
import { QUAL_TYPES } from '@/lib/teamTypes';

export const runtime = 'nodejs';

const pick = (v: FormDataEntryValue | null, list: { key: string }[]) => {
  const s = String(v ?? '');
  return list.some((o) => o.key === s) ? s : null;
};

/** Employers save the current Recruitment filters as an email alert, or remove one. */
export async function POST(req: NextRequest) {
  const back = (q: string) => NextResponse.redirect(new URL(`/recruitment?tab=people&${q}#alerts`, req.url), 303);
  const fd = await req.formData().catch(() => null);
  if (!fd || !sameOrigin(req)) return back('alert_error=' + encodeURIComponent('Please use the form on our website.'));
  const email = await getSessionEmail();
  if (!email) return NextResponse.redirect(new URL('/login?next=/recruitment?tab=people', req.url), 303);
  if (!(await employerAccess(email)).ok) return back('alert_error=' + encodeURIComponent('Alerts are for paying members and checked main contractors.'));

  if (fd.get('action') === 'remove') {
    await db().from('recruit_alerts').delete().eq('id', String(fd.get('id') ?? '')).eq('email', email);
    return back('alert_off=1');
  }

  const { count } = await db().from('recruit_alerts').select('id', { count: 'exact', head: true }).eq('email', email);
  if ((count ?? 0) >= 10) return back('alert_error=' + encodeURIComponent('You already have 10 alerts. Remove one first.'));
  let loc: { postcode: string | null; lat: number | null; lng: number | null } = { postcode: null, lat: null, lng: null };
  const pcIn = String(fd.get('postcode') ?? '').trim();
  if (pcIn) {
    const pc = await lookupPostcode(pcIn);
    if (!pc.ok) return back('alert_error=' + encodeURIComponent(pc.reason));
    loc = { postcode: pc.postcode, lat: pc.lat, lng: pc.lng };
  }
  const { error } = await db().from('recruit_alerts').insert({
    email,
    skill: pick(fd.get('skill'), SKILLS), level: pick(fd.get('level'), LEVELS), card: pick(fd.get('card'), QUAL_TYPES),
    ...loc,
    own_vehicle: fd.get('van') === '1', available_now: fd.get('now') === '1',
    token: randomBytes(18).toString('base64url'),
  });
  if (error) { console.error('recruit alert save failed', error); return back('alert_error=' + encodeURIComponent('Could not save the alert. Please try again.')); }
  return back('alert_on=1');
}

/** One-click "turn this alert off" from the email. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('off') ?? '';
  if (token && token.length < 100) await db().from('recruit_alerts').delete().eq('token', token);
  return NextResponse.redirect(new URL('/recruitment?tab=people&alert_off=1', req.url), 303);
}
