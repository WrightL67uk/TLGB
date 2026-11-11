import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { emailWaitlistWelcome, emailAdminWaitlist } from '@/lib/email';
import { TYPE_LABEL } from '@/lib/waitlistType';

export const runtime = 'nodejs';

const Schema = z.object({
  name: z.string().trim().min(2, 'Please add your name').max(100),
  business_name: z.string().trim().min(2, 'Please add your business name').max(120),
  email: z.string().trim().toLowerCase().email('Please check your email address').max(200),
  phone: z.string().trim().regex(/^[0-9+()\s-]{7,30}$/, 'Please check your phone number'),
  member_type: z.enum(['trade', 'supplier'], { message: 'Please choose trade or supplier' }),
});

/** Coming soon page: adds someone to the waiting list. */
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  // Back to whichever page the form was on: the homepage or the permanent /waitlist page
  const from = fd?.get('from') === '/waitlist' ? '/waitlist' : '/';
  const src = String(fd?.get('src') ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30) || null;
  const back = (q: string) => NextResponse.redirect(new URL(`${from}?${q}${src ? `&src=${src}` : ''}#top`, req.url), 303);
  if (!fd) return back('error=' + encodeURIComponent('Something went wrong. Please try again.'));
  if (fd.get('website_url')) return back('joined=1'); // bot filled the hidden box
  if (!sameOrigin(req)) return back('error=' + encodeURIComponent('Please use the form on this website.'));
  const p = Schema.safeParse(Object.fromEntries(['name', 'business_name', 'email', 'phone', 'member_type'].map((k) => [k, fd.get(k) ?? ''])));
  if (!p.success) return back('error=' + encodeURIComponent(p.error.issues[0]?.message ?? 'Please check the form.'));
  const d = p.data;

  const { data: existing } = await db().from('waitlist').select('id').ilike('email', d.email).maybeSingle();
  if (existing) return back('joined=1&already=1');

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();
  const ipHash = ip ? createHash('sha256').update(`waitlist:${ip}`).digest('hex') : null;
  if (ipHash) {
    const { count } = await db().from('waitlist').select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash).gte('created_at', new Date(Date.now() - 3_600_000).toISOString());
    if ((count ?? 0) >= 10) return back('error=' + encodeURIComponent('Too many sign-ups from here in the last hour. Please try again later.'));
  }

  const { error } = await db().from('waitlist').insert({ name: d.name, business_name: d.business_name, email: d.email, phone: d.phone, ip_hash: ipHash, member_type: d.member_type, source: src ?? (from === '/' ? 'homepage' : 'waitlist page') });
  if (error) {
    if (error.code === '23505') return back('joined=1&already=1');
    console.error('waitlist save failed', error);
    return back('error=' + encodeURIComponent('Something went wrong. Please try again.'));
  }
  const { count } = await db().from('waitlist').select('id', { count: 'exact', head: true });
  await emailWaitlistWelcome(d.email, d.name);
  await emailAdminWaitlist({ name: d.name, business: d.business_name, email: d.email, phone: d.phone, type: TYPE_LABEL[d.member_type], source: src === 'qr' ? 'QR code' : src ?? undefined }, count ?? 0);
  return back('joined=1');
}
