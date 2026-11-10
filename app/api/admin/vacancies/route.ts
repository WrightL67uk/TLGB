import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';

export const runtime = 'nodejs';

// Behind the admin login (middleware). Remove or restore a vacancy, or change a member's post limit.
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  if (!fd || !sameOrigin(req)) return NextResponse.redirect(new URL('/admin/vacancies?error=Please+use+the+form', req.url), 303);
  const action = String(fd.get('action') ?? '');
  if (action === 'limit') {
    const id = String(fd.get('business_id') ?? '');
    const limit = Math.max(0, Math.min(500, Math.round(Number(fd.get('limit')))));
    if (!/^[0-9a-f-]{36}$/.test(id) || !Number.isFinite(limit)) return NextResponse.redirect(new URL('/admin', req.url), 303);
    await db().from('businesses').update({ vacancy_limit: limit }).eq('id', id);
    await db().from('review_events').insert({ business_id: id, action: 'billing', actor: 'admin', detail: `Vacancy post limit set to ${limit}` }).then(() => null, () => null);
    return NextResponse.redirect(new URL(`/admin/${id}?saved=1`, req.url), 303);
  }
  const vid = String(fd.get('id') ?? '');
  if (!/^[0-9a-f-]{36}$/.test(vid)) return NextResponse.redirect(new URL('/admin/vacancies?error=Not+found', req.url), 303);
  if (action === 'remove') await db().from('vacancies').update({ status: 'removed' }).eq('id', vid);
  if (action === 'restore') await db().from('vacancies').update({ status: 'closed' }).eq('id', vid);
  return NextResponse.redirect(new URL(`/admin/vacancies?done=${action}`, req.url), 303);
}
