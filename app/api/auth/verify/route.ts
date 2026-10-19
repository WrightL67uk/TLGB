import { NextRequest, NextResponse } from 'next/server';
import { consumeLoginToken, createSession, sessionCookieOptions, SESSION_COOKIE } from '@/lib/session';

export const runtime = 'nodejs';

// The emailed link opens /login/verify, which shows a button that posts here.
// Using a button (not the link itself) stops company email scanners such as
// Microsoft Defender and Mimecast from using up the one-time link when they
// pre-check it.
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const email = await consumeLoginToken(String(fd?.get('token') ?? ''));
  if (!email) return NextResponse.redirect(new URL('/login?error=expired', req.url), 303);

  const { raw, expires } = await createSession(email);
  const res = NextResponse.redirect(new URL('/account', req.url), 303);
  res.cookies.set(SESSION_COOKIE, raw, sessionCookieOptions(expires));
  return res;
}
