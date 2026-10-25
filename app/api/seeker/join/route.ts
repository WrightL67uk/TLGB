import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { createLoginToken, recentLoginRequests, sameOrigin } from '@/lib/session';
import { emailSeekerWelcome } from '@/lib/email';
import { siteUrl } from '@/lib/config';

export const runtime = 'nodejs';

const LINK_MINUTES = 60;
const Schema = z.object({
  first_name: z.string().trim().min(1, 'Enter your first name').max(60),
  last_name: z.string().trim().min(1, 'Enter your surname').max(60),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(200),
});

const back = (req: NextRequest, q: string) => NextResponse.redirect(new URL(`/looking-for-work?${q}#start`, req.url), 303);

/** Start a free job seeker profile: save the name, then email a link to finish it. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return back(req, 'error=' + encodeURIComponent('Please use the form on our website.'));
  const fd = await req.formData().catch(() => null);
  if (!fd) return back(req, 'error=' + encodeURIComponent('Something went wrong. Please try again.'));
  if (String(fd.get('company_url') ?? '')) return back(req, 'sent=1');
  if (fd.get('agree') !== 'yes') return back(req, 'error=' + encodeURIComponent('Tick the box to agree to the website terms.'));
  const p = Schema.safeParse({ first_name: fd.get('first_name'), last_name: fd.get('last_name'), email: fd.get('email') });
  if (!p.success) return back(req, 'error=' + encodeURIComponent(p.error.issues[0].message));
  const d = p.data;

  const { data: existing } = await db().from('job_seekers').select('id, status').eq('email', d.email).neq('status', 'removed').maybeSingle();
  if (!existing) {
    const { data: removed } = await db().from('job_seekers').select('id').eq('email', d.email).eq('status', 'removed').limit(1);
    if (removed?.length) return back(req, 'error=' + encodeURIComponent('We cannot create a profile for this email address. Contact us if you think this is a mistake.'));
    const { error } = await db().from('job_seekers').insert({ email: d.email, first_name: d.first_name, last_name: d.last_name });
    if (error) {
      console.error('seeker insert failed', error);
      return back(req, 'error=' + encodeURIComponent('Something went wrong. Please try again.'));
    }
  }
  // Same answer either way, and no more than a few emails an hour
  if ((await recentLoginRequests(d.email)) < 5) {
    const token = await createLoginToken(d.email, LINK_MINUTES);
    await emailSeekerWelcome(d.email, d.first_name, `${siteUrl()}/login/verify?token=${encodeURIComponent(token)}&next=${encodeURIComponent('/seeker')}`, LINK_MINUTES, !!existing);
  }
  return back(req, 'sent=1');
}
