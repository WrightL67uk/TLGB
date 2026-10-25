import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { getSessionEmail, sameOrigin } from '@/lib/session';
import { seekerName } from '@/lib/seekers';
import { emailAdminSeekerReport } from '@/lib/email';

export const runtime = 'nodejs';

/** Anyone logged in can flag a job seeker profile for admin to look at. */
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const id = String(fd?.get('id') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.redirect(new URL('/workers', req.url), 303);
  const back = (q: string) => NextResponse.redirect(new URL(`/workers/${id}?${q}`, req.url), 303);
  if (!fd || !sameOrigin(req)) return back('error=' + encodeURIComponent('Please use the form on our website.'));
  const email = await getSessionEmail();
  if (!email) return NextResponse.redirect(new URL(`/login?next=/workers/${id}`, req.url), 303);
  const reason = String(fd.get('reason') ?? '').trim().slice(0, 1000);
  if (reason.length < 5) return back('error=' + encodeURIComponent('Tell us briefly what is wrong with this profile.'));
  const { data: s } = await db().from('job_seekers').select('id, first_name, last_name, show_full_name').eq('id', id).maybeSingle();
  if (s) await emailAdminSeekerReport({ id, name: seekerName(s) }, email, reason);
  return back('reported=1');
}
