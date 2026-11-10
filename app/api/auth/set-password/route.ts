import { NextRequest, NextResponse } from 'next/server';
import { getSessionEmail, sameOrigin } from '@/lib/session';
import { passwordProblem, setPassword } from '@/lib/passwords';

export const runtime = 'nodejs';

/** A logged-in person sets or changes their password. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false, error: 'Request blocked.' }, { status: 403 });
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ ok: false, error: 'Please log in again.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const problem = passwordProblem(body?.password);
  if (problem) return NextResponse.json({ ok: false, error: problem }, { status: 400 });
  if (body?.password !== body?.confirm) return NextResponse.json({ ok: false, error: 'The two passwords do not match.' }, { status: 400 });
  const { error } = await setPassword(email, body.password);
  if (error) return NextResponse.json({ ok: false, error: 'Could not save your password. Try again.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
