import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { canLogIn } from '@/lib/passwords';
import { createLoginToken, recentLoginRequests, sameOrigin } from '@/lib/session';
import { emailHomeWelcome } from '@/lib/email';
import { tooMany, visitor, TOO_MANY } from '@/lib/rateLimit';
import { siteUrl } from '@/lib/config';

export const runtime = 'nodejs';

const LINK_MINUTES = 60;
const Schema = z.object({
  first_name: z.string().trim().min(1, 'Enter your first name').max(60),
  last_name: z.string().trim().min(1, 'Enter your surname').max(60),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(200),
  postcode: z.string().trim().max(10).optional(),
});

const SAFE_NEXT = /^\/(search|suppliers)(\?[^\s]{0,200})?$/;
const back = (req: NextRequest, q: string) => NextResponse.redirect(new URL(`/homeowners?${q}`, req.url), 303);

/** A free homeowner account: save the name, then email a link to log in. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return back(req, 'error=' + encodeURIComponent('Please use the form on our website.'));
  if (await tooMany('home-join', visitor(req), 10, 60)) return back(req, 'error=' + encodeURIComponent(TOO_MANY));
  const fd = await req.formData().catch(() => null);
  if (!fd) return back(req, 'error=' + encodeURIComponent('Something went wrong. Please try again.'));
  if (String(fd.get('company_url') ?? '')) return back(req, 'sent=1');
  if (fd.get('agree') !== 'yes') return back(req, 'error=' + encodeURIComponent('Tick the box to agree to the website terms.'));
  const p = Schema.safeParse({ first_name: fd.get('first_name'), last_name: fd.get('last_name'), email: fd.get('email'), postcode: fd.get('postcode') || undefined });
  if (!p.success) return back(req, 'error=' + encodeURIComponent(p.error.issues[0].message));
  const d = p.data;
  const rawNext = String(fd.get('next') ?? '');
  const next = SAFE_NEXT.test(rawNext) ? rawNext : '/search';

  const { count: mine } = await db().from('home_users').select('id', { count: 'exact', head: true }).eq('email', d.email).neq('status', 'removed');
  const exists = (mine ?? 0) > 0;
  // An email that already belongs to a trade, supplier or job seeker account just gets a log in link, no new account
  const other = !exists && (await canLogIn(d.email));
  if (!exists && !other) {
    const { error } = await db().from('home_users').insert({ email: d.email, first_name: d.first_name, last_name: d.last_name, postcode: d.postcode ?? null });
    if (error) {
      console.error('home user insert failed', error);
      return back(req, 'error=' + encodeURIComponent('Something went wrong. Please try again.'));
    }
  }
  // Same answer either way, and no more than a few emails an hour
  if ((await recentLoginRequests(d.email)) < 5) {
    const token = await createLoginToken(d.email, LINK_MINUTES);
    await emailHomeWelcome(d.email, d.first_name, `${siteUrl()}/login/verify?token=${encodeURIComponent(token)}&next=${encodeURIComponent(next)}`, LINK_MINUTES, exists || other);
  }
  return back(req, 'sent=1');
}
