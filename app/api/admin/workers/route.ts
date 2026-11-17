import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { SEEKER_LIVE_DAYS } from '@/lib/seekerTypes';
import { countAgencyReferral } from '@/lib/seekerApproval';
import { emailSeekerApproved, emailSeekerNotApproved } from '@/lib/email';

export const runtime = 'nodejs';

// Behind the admin password (middleware). Remove or restore a job seeker profile.
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const id = String(fd?.get('id') ?? '');
  const action = String(fd?.get('action') ?? '');
  if (/^[0-9a-f-]{36}$/i.test(id)) {
    if (action === 'approve') {
      const now = new Date();
      const { data: s } = await db().from('job_seekers').update({
        status: 'live', approved_at: now.toISOString(), expires_at: new Date(now.getTime() + SEEKER_LIVE_DAYS * 86_400_000).toISOString(),
        expiry_warned_at: null, removed_reason: null, updated_at: now.toISOString(),
      }).eq('id', id).eq('status', 'pending').select('email, first_name').maybeSingle();
      if (s) {
        await countAgencyReferral(id, s.email).catch((e) => console.error('agency referral failed', e));
        await emailSeekerApproved(s.email, s.first_name, SEEKER_LIVE_DAYS).catch(() => null);
      }
    } else if (action === 'reject') {
      const reason = String(fd?.get('reason') ?? '').trim().slice(0, 300) || null;
      const { data: s } = await db().from('job_seekers').update({ status: 'removed', removed_reason: reason, updated_at: new Date().toISOString() }).eq('id', id).eq('status', 'pending').select('email, first_name').maybeSingle();
      if (s) await emailSeekerNotApproved(s.email, s.first_name, reason).catch(() => null);
    } else if (action === 'remove') {
      const reason = String(fd?.get('reason') ?? '').trim().slice(0, 300) || null;
      await db().from('job_seekers').update({ status: 'removed', removed_reason: reason, updated_at: new Date().toISOString() }).eq('id', id);
    } else if (action === 'restore') {
      await db().from('job_seekers').update({ status: 'paused', removed_reason: null, updated_at: new Date().toISOString() }).eq('id', id);
    } else if (action === 'delete') {
      await db().from('job_seekers').delete().eq('id', id);
    }
  }
  return NextResponse.redirect(new URL('/admin/workers', req.url), 303);
}
