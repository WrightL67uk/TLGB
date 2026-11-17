import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { REF_COOKIE } from '@/lib/agencies';

export const runtime = 'nodejs';

/** A recruitment agency's own link: remembers who sent the visitor, then opens the job seeker sign-up. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const res = NextResponse.redirect(new URL('/looking-for-work', req.url), 307);
  if (/^[a-z0-9]{6,16}$/.test(code)) {
    const { data } = await db().from('agencies').select('id').eq('referral_code', code).eq('status', 'approved').maybeSingle();
    if (data) res.cookies.set(REF_COOKIE, code, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
  }
  return res;
}
