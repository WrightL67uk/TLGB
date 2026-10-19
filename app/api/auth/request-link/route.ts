import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { createLoginToken, recentLoginRequests, sameOrigin } from '@/lib/session';
import { emailLoginLink } from '@/lib/email';
import { siteUrl } from '@/lib/config';

export const runtime = 'nodejs';

const LINK_MINUTES = 30;

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false, error: 'Request blocked.' }, { status: 403 });
  const body = await req.json().catch(() => null);
  const parsed = z.string().trim().toLowerCase().email().safeParse(body?.email);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Enter a valid email address.' }, { status: 400 });
  const email = parsed.data;

  // Always give the same answer, so nobody can use this form to find out who is listed.
  const done = NextResponse.json({ ok: true });

  const { count } = await db()
    .from('businesses')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .neq('status', 'draft');
  if (!count) return done;
  if ((await recentLoginRequests(email)) >= 5) return done;

  const token = await createLoginToken(email, LINK_MINUTES);
  await emailLoginLink(email, `${siteUrl()}/login/verify?token=${encodeURIComponent(token)}`, LINK_MINUTES);
  return done;
}
