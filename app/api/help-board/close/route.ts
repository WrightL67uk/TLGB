import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { getSessionEmail, sameOrigin } from '@/lib/session';

export const runtime = 'nodejs';

/** The person who posted a request can close it. */
export async function POST(req: NextRequest) {
  const email = await getSessionEmail();
  if (!sameOrigin(req) || !email) return NextResponse.redirect(new URL('/help-board', req.url), 303);
  const fd = await req.formData().catch(() => null);
  const id = String(fd?.get('id') ?? '');
  if (/^[0-9a-f-]{36}$/i.test(id)) await db().from('help_requests').update({ status: 'closed' }).eq('id', id).eq('email', email);
  return NextResponse.redirect(new URL('/help-board?closed=1', req.url), 303);
}
