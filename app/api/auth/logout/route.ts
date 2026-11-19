import { NextRequest, NextResponse } from 'next/server';
import { destroySession, safeNext, SESSION_COOKIE } from '@/lib/session';
import { ROLE_COOKIE } from '@/lib/roles';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  await destroySession(req.cookies.get(SESSION_COOKIE)?.value);
  const fd = await req.formData().catch(() => null);
  const res = NextResponse.redirect(new URL(safeNext(fd?.get('next'), '/'), req.url), 303);
  res.cookies.delete(SESSION_COOKIE);
  res.cookies.delete(ROLE_COOKIE);
  return res;
}
