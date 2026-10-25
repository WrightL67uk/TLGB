import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export const runtime = 'nodejs';

// Behind the admin password (middleware). Remove or restore a job seeker profile.
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const id = String(fd?.get('id') ?? '');
  const action = String(fd?.get('action') ?? '');
  if (/^[0-9a-f-]{36}$/i.test(id)) {
    if (action === 'remove') {
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
