import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';

export const runtime = 'nodejs';

/** The person pressed Unsubscribe. The id in the link is unguessable. */
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const back = (q: string) => NextResponse.redirect(new URL(`/newsletter/unsubscribe?${q}`, req.url), 303);
  if (!fd || !sameOrigin(req)) return back('state=bad');
  const id = String(fd.get('id') ?? '');
  if (!/^[0-9a-f-]{36}$/.test(id)) return back('state=bad');
  await db().from('newsletter_subscribers').update({ unsubscribed_at: new Date().toISOString() }).eq('id', id);
  return back('state=done');
}
