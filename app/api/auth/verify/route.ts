import { NextRequest, NextResponse } from 'next/server';
import { consumeLoginToken, safeNext } from '@/lib/session';
import { pickRole, startSession } from '@/lib/roles';

export const runtime = 'nodejs';

// The emailed link opens /login/verify, which shows a button that posts here.
// Using a button (not the link itself) stops company email scanners such as
// Microsoft Defender and Mimecast from using up the one-time link when they
// pre-check it.
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const email = await consumeLoginToken(String(fd?.get('token') ?? ''));
  if (!email) return NextResponse.redirect(new URL('/login?error=expired', req.url), 303);

  const next = safeNext(fd?.get('next'));
  const { role } = await pickRole(email, null, next);
  const sess = await startSession(req, email, role);
  return sess.apply(NextResponse.redirect(new URL(next, req.url), 303));
}
