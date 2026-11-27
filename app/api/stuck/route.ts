import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { peekLoginToken } from '@/lib/session';
import { emailAdminStuck } from '@/lib/email';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const fd = await req.formData();
  const id = String(fd.get('b') ?? ''); const token = String(fd.get('t') ?? '');
  const note = String(fd.get('note') ?? '').trim().slice(0, 1000);
  const expired = NextResponse.redirect(new URL('/stuck', req.url), 303);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !token) return expired;
  const email = await peekLoginToken(token);
  if (!email) return expired;
  const { data: b } = await db().from('businesses').select('id, trading_name, email, contact_name').eq('id', id).eq('email', email).maybeSingle();
  if (!b) return expired;
  if (String(fd.get('stop') ?? '') === '1') {
    await db().from('businesses').update({ nudges_stopped_at: new Date().toISOString() }).eq('id', b.id);
    await db().from('review_events').insert({ business_id: b.id, action: 'note', actor: b.email, detail: 'Asked us to stop sign-up reminders' });
    return NextResponse.redirect(new URL('/stuck?stopped=1', req.url), 303);
  }
  await db().from('businesses').update({ stuck_at: new Date().toISOString(), stuck_note: note || null, stuck_handled_at: null }).eq('id', b.id);
  await db().from('review_events').insert({ business_id: b.id, action: 'note', actor: b.email, detail: `Pressed "I'm stuck" in a sign-up reminder${note ? `: ${note}` : ''}` });
  await emailAdminStuck(b, note).catch(() => null);
  return NextResponse.redirect(new URL('/stuck?done=1', req.url), 303);
}
