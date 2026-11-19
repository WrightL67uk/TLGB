import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { safeNext, sameOrigin } from '@/lib/session';
import { startSession } from '@/lib/roles';
import { canLogIn, checkPassword, lockedOut } from '@/lib/passwords';
import { homeFor, pickRole, roleFromPath, roleShort } from '@/lib/roles';

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

  const requested = safeNext(body?.next);
  const { role, missing } = await pickRole(email.data, body?.as, requested);
  if (missing) return NextResponse.json({ ok: false, error: `That email is not registered as a ${roleShort(missing)}. Choose a different option above, or check the email address.` }, { status: 401 });
  // Default destination is the chosen role's own home
  const target = role && (requested === '/account' || (roleFromPath(requested) && roleFromPath(requested) !== role)) ? await homeFor(role, email.data) : requested;
  const sess = await startSession(req, email.data, role);
  return sess.apply(NextResponse.json({ ok: true, next: target }));
}
