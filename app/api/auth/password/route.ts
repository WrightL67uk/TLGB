import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSession, safeNext, sameOrigin, sessionCookieOptions, SESSION_COOKIE } from '@/lib/session';
import { canLogIn, checkPassword, lockedOut } from '@/lib/passwords';

export const runtime = 'nodejs';

const WRONG = 'That email and password do not match. Check them, or use "Email me a login link" below.';

/** Log in with email and password. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false, error: 'Request blocked.' }, { status: 403 });
  const body = await req.json().catch(() => null);
  const email = z.string().trim().toLowerCase().email().safeParse(body?.email);
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!email.success || !password) return NextResponse.json({ ok: false, error: 'Enter your email and password.' }, { status: 400 });
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';

  if (await lockedOut(email.data, ip)) {
    return NextResponse.json({ ok: false, error: 'Too many tries. Wait 15 minutes, or use "Email me a login link" below.' }, { status: 429 });
  }
  const ok = await checkPassword(email.data, password, ip);
  if (!ok || !(await canLogIn(email.data))) return NextResponse.json({ ok: false, error: WRONG }, { status: 401 });

  const { raw, expires } = await createSession(email.data);
  const res = NextResponse.json({ ok: true, next: safeNext(body?.next) });
  res.cookies.set(SESSION_COOKIE, raw, sessionCookieOptions(expires));
  return res;
}
