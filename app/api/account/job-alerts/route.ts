import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { ownedBusiness } from '@/lib/account';

export const runtime = 'nodejs';

/** Turns job emails from main contractors on or off for a listing. */
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const id = String(fd?.get('business_id') ?? '');
  if (!sameOrigin(req) || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.redirect(new URL('/account', req.url), 303);
  const own = await ownedBusiness(id);
  if (!own.ok) return NextResponse.redirect(new URL('/login', req.url), 303);
  await db().from('businesses').update({ job_alerts: fd?.get('on') === '1' }).eq('id', id);
  return NextResponse.redirect(new URL(`/account/${id}#job-alerts`, req.url), 303);
}
