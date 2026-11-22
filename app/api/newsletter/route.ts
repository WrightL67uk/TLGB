import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { tooMany, visitor } from '@/lib/rateLimit';
import { newToken, tokenHash } from '@/lib/signing';
import { emailNewsletterConfirm } from '@/lib/email';
import { CONSENT_TEXT } from '@/lib/newsletter';

export const runtime = 'nodejs';

const Schema = z.object({
  name: z.string().trim().min(2, 'Please add your name').max(100),
  email: z.string().trim().toLowerCase().email('Please check your email address').max(200),
});

/** Newsletter sign-up: records the consent, then emails a link to confirm the address. */
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const src = String(fd?.get('src') ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30) || null;
  const back = (q: string) => NextResponse.redirect(new URL(`/newsletter?${q}${src ? `&src=${src}` : ''}`, req.url), 303);
  if (!fd) return back('error=' + encodeURIComponent('Something went wrong. Please try again.'));
  if (fd.get('website_url')) return back('sent=1'); // a bot filled the hidden box
  if (!sameOrigin(req)) return back('error=' + encodeURIComponent('Please use the form on this website.'));
  if (fd.get('consent') !== 'yes') return back('error=' + encodeURIComponent('Please tick the box to agree to receive our emails.'));
  const p = Schema.safeParse({ name: fd.get('name') ?? '', email: fd.get('email') ?? '' });
  if (!p.success) return back('error=' + encodeURIComponent(p.error.issues[0]?.message ?? 'Please check the form.'));
  const d = p.data;
  const who = visitor(req);
  if (await tooMany('newsletter', who, 8, 60)) return back('error=' + encodeURIComponent('Too many sign-ups from here. Please try again later.'));

  const token = newToken();
  const { data: existing } = await db().from('newsletter_subscribers').select('id, confirmed_at, unsubscribed_at').ilike('email', d.email).maybeSingle();
  if (existing?.confirmed_at && !existing.unsubscribed_at) return back('sent=1'); // already subscribed: say nothing new
  if (existing) {
    // Not confirmed yet, or came back after unsubscribing: fresh consent and a fresh confirmation email
    await db().from('newsletter_subscribers').update({
      name: d.name, consent_text: CONSENT_TEXT, consented_at: new Date().toISOString(), ip_hash: who,
      confirm_token_hash: tokenHash(token), confirmed_at: null, unsubscribed_at: null,
    }).eq('id', existing.id);
  } else {
    const { error } = await db().from('newsletter_subscribers').insert({
      name: d.name, email: d.email, consent_text: CONSENT_TEXT, ip_hash: who, source: src, confirm_token_hash: tokenHash(token),
    });
    if (error && error.code !== '23505') {
      console.error('newsletter save failed', error);
      return back('error=' + encodeURIComponent('Something went wrong. Please try again.'));
    }
  }
  await emailNewsletterConfirm(d.email, d.name, token);
  return back('sent=1');
}
