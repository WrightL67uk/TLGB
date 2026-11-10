import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { siteUrl } from '@/lib/config';
import { sameOrigin } from '@/lib/session';
import { issueAdminToken, RESET_MINUTES } from '@/lib/adminAuth';
import { emailAdminReset } from '@/lib/email';

export const runtime = 'nodejs';

/** Always gives the same answer, so it cannot be used to find out who is an admin. */
export async function POST(req: NextRequest) {
  const done = NextResponse.redirect(new URL('/admin/login?sent=1', req.url), 303);
  const fd = await req.formData().catch(() => null);
  if (!fd || !sameOrigin(req)) return done;
  const email = String(fd.get('email') ?? '').trim().toLowerCase();
  if (!email || email.length > 200) return done;
  const { data: a } = await db().from('admin_users').select('id, name, email, password_hash, token_expires_at').ilike('email', email).is('removed_at', null).maybeSingle();
  if (!a) return done;
  // One reset email every 2 minutes at most
  if (a.token_expires_at && new Date(a.token_expires_at).getTime() - RESET_MINUTES * 60_000 > Date.now() - 120_000 && a.password_hash) return done;
  const raw = await issueAdminToken(a.id, RESET_MINUTES);
  await emailAdminReset(a.email, a.name, `${siteUrl()}/admin/setup?token=${raw}`, RESET_MINUTES);
  return done;
}
