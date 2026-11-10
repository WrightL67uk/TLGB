import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { siteUrl } from '@/lib/config';
import { sameOrigin } from '@/lib/session';
import { currentAdmin, issueAdminToken, INVITE_HOURS } from '@/lib/adminAuth';
import { emailAdminInvite } from '@/lib/email';

export const runtime = 'nodejs';

const New = z.object({
  name: z.string().trim().min(2, 'Add their name').max(100),
  email: z.string().trim().toLowerCase().email('Check the email address').max(200),
});

// Behind the admin login (middleware). Add, re-invite or remove admins.
export async function POST(req: NextRequest) {
  const back = (q: string) => NextResponse.redirect(new URL(`/admin/admins?${q}`, req.url), 303);
  const fd = await req.formData().catch(() => null);
  if (!fd || !sameOrigin(req)) return back('error=' + encodeURIComponent('Please use the form.'));
  const me = await currentAdmin();
  const byName = me?.name ?? 'An admin';
  const action = String(fd.get('action') ?? '');

  const invite = async (id: string, name: string, email: string) => {
    const raw = await issueAdminToken(id, INVITE_HOURS * 60);
    await emailAdminInvite(email, name, byName, `${siteUrl()}/admin/setup?token=${raw}`, INVITE_HOURS);
  };

  if (action === 'add') {
    const p = New.safeParse({ name: fd.get('name') ?? '', email: fd.get('email') ?? '' });
    if (!p.success) return back('error=' + encodeURIComponent(p.error.issues[0]?.message ?? 'Check the form.'));
    const { name, email } = p.data;
    const { data: existing } = await db().from('admin_users').select('id, removed_at').ilike('email', email).maybeSingle();
    let id: string;
    if (existing && !existing.removed_at) return back('error=' + encodeURIComponent(`${email} is already an admin.`));
    if (existing) {
      await db().from('admin_users').update({ name, removed_at: null, password_hash: null, invited_by: byName }).eq('id', existing.id);
      id = existing.id;
    } else {
      const { data, error } = await db().from('admin_users').insert({ name, email, invited_by: byName }).select('id').single();
      if (error || !data) return back('error=' + encodeURIComponent('Could not add them. Please try again.'));
      id = data.id;
    }
    await invite(id, name, email);
    return back('msg=' + encodeURIComponent(`Added ${name}. We have emailed ${email} a link to choose a password.`));
  }

  const id = String(fd.get('id') ?? '');
  if (!/^[0-9a-f-]{36}$/.test(id)) return back('error=Not+found');
  const { data: a } = await db().from('admin_users').select('id, name, email').eq('id', id).is('removed_at', null).maybeSingle();
  if (!a) return back('error=Not+found');

  if (action === 'resend') {
    await invite(a.id, a.name, a.email);
    return back('msg=' + encodeURIComponent(`Sent ${a.name} a new link to choose a password.`));
  }
  if (action === 'remove') {
    if (me?.id === a.id) return back('error=' + encodeURIComponent('You cannot remove yourself. Ask another admin to do it.'));
    await db().from('admin_users').update({ removed_at: new Date().toISOString(), password_hash: null, token_hash: null, token_expires_at: null }).eq('id', a.id);
    await db().from('admin_sessions').delete().eq('admin_id', a.id);
    return back('msg=' + encodeURIComponent(`Removed ${a.name}. They are logged out and can no longer get into admin.`));
  }
  return back('error=Unknown+action');
}
