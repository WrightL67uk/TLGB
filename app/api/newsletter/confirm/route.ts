import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { tokenHash } from '@/lib/signing';

export const runtime = 'nodejs';

/** The person pressed Confirm on the page their email link opened. */
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const back = (q: string) => NextResponse.redirect(new URL(`/newsletter/confirm?${q}`, req.url), 303);
  if (!fd || !sameOrigin(req)) return back('state=bad');
  const t = String(fd.get('t') ?? '');
  if (t.length < 20 || t.length > 100) return back('state=bad');
  const { data } = await db().from('newsletter_subscribers').update({ confirmed_at: new Date().toISOString(), confirm_token_hash: null, unsubscribed_at: null })
    .eq('confirm_token_hash', tokenHash(t)).select('id').maybeSingle();
  return back(data ? 'state=done' : 'state=bad');
}
