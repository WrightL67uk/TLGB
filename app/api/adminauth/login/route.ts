import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { sameOrigin, safeNext } from '@/lib/session';
import { lockedOut } from '@/lib/passwords';
import { ADMIN_COOKIE, adminCookieOptions, checkAdminPassword, createAdminSession, isMaster } from '@/lib/adminAuth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const next = safeNext(fd?.get('next'), '/admin');
  const fail = (msg: string) => NextResponse.redirect(new URL(`/admin/login?next=${encodeURIComponent(next)}&error=${encodeURIComponent(msg)}`, req.url), 303);
  if (!fd || !sameOrigin(req)) return fail('Please use the login form.');
  const login = String(fd.get('email') ?? '').trim();
  const pw = String(fd.get('password') ?? '');
  if (!login || !pw) return fail('Enter your email and password.');
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const key = `admin:${login.toLowerCase()}`;
  let session;
  if (isMaster(login, pw)) {
    session = await createAdminSession(null, 'Master login');
  } else {
    if (await lockedOut(key, ip)) return fail('Too many wrong attempts. Wait 15 minutes and try again.');
    const admin = await checkAdminPassword(login.toLowerCase(), pw);
    await db().from('login_attempts').insert({ email: key, ip, ok: !!admin });
    if (!admin) return fail('That email and password do not match.');
    session = await createAdminSession(admin.id, admin.name);
  }
  const res = NextResponse.redirect(new URL(next, req.url), 303);
  res.cookies.set(ADMIN_COOKIE, session.raw, adminCookieOptions(session.expires));
  return res;
}
