import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { emailApplicantApproved, emailApplicantRejected } from '@/lib/email';
import { createLoginToken } from '@/lib/session';
import { siteUrl } from '@/lib/config';

export const runtime = 'nodejs';

function actorFrom(req: NextRequest) {
  const h = req.headers.get('authorization') ?? '';
  try { return atob(h.replace(/^Basic /, '')).split(':')[0] || 'admin'; } catch { return 'admin'; }
}

// Protected by middleware.ts (Basic Auth). Plain HTML form posts, so no JS needed in admin.
export async function POST(req: NextRequest) {
  const fd = await req.formData();
  const id = String(fd.get('id') ?? '');
  const action = String(fd.get('action') ?? '');
  const reason = String(fd.get('reason') ?? '').trim();
  const notes = String(fd.get('notes') ?? '').trim();
  const actor = actorFrom(req);

  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse('Bad id', { status: 400 });

  const { data: b } = await db().from('businesses').select('id, status, email, contact_name, trading_name').eq('id', id).maybeSingle();
  if (!b) return new NextResponse('Not found', { status: 404 });

  const now = new Date().toISOString();

  if (action === 'approve') {
    if (!['pending_review', 'suspended', 'rejected'].includes(b.status)) return new NextResponse('Cannot approve from this status', { status: 409 });
    await db().from('businesses').update({
      status: 'approved', reviewed_at: now, reviewed_by: actor, rejection_reason: null,
      recheck_required: false, recheck_reason: null,
      founding_member: fd.get('founding_member') === 'on',
      admin_notes: notes || null,
    }).eq('id', id);
    await db().from('review_events').insert({ business_id: id, action: 'approved', actor, detail: notes || null });
    await emailApplicantApproved(b.email, b.contact_name, b.trading_name);
  } else if (action === 'reject') {
    if (b.status !== 'pending_review') return new NextResponse('Only pending applications can be rejected', { status: 409 });
    if (!reason) return new NextResponse('A reason is required', { status: 400 });
    await db().from('businesses').update({ status: 'rejected', reviewed_at: now, reviewed_by: actor, rejection_reason: reason }).eq('id', id);
    await db().from('review_events').insert({ business_id: id, action: 'rejected', actor, detail: reason });
    await emailApplicantRejected(b.email, b.contact_name, b.trading_name, reason);
  } else if (action === 'suspend') {
    if (b.status !== 'approved') return new NextResponse('Only approved listings can be suspended', { status: 409 });
    await db().from('businesses').update({ status: 'suspended', reviewed_at: now, reviewed_by: actor, admin_notes: reason }).eq('id', id);
    await db().from('review_events').insert({ business_id: id, action: 'suspended', actor, detail: reason });
  } else if (action === 'clear_recheck') {
    await db().from('businesses').update({ recheck_required: false, recheck_reason: null }).eq('id', id);
    await db().from('review_events').insert({ business_id: id, action: 'rechecked', actor, detail: notes || null });
  } else if (action === 'login_link') {
    // For support, or for demos before SendGrid is set up. Valid 24 hours, one use.
    if (b.status === 'draft') return new NextResponse('Not available for drafts', { status: 409 });
    const token = await createLoginToken(b.email, 24 * 60, actor);
    await db().from('review_events').insert({ business_id: id, action: 'login_link', actor, detail: 'Login link created in admin' });
    const link = `${siteUrl()}/login/verify?token=${encodeURIComponent(token)}`;
    return NextResponse.redirect(new URL(`/admin/${id}?login_link=${encodeURIComponent(link)}`, req.url), 303);
  } else {
    return new NextResponse('Unknown action', { status: 400 });
  }

  return NextResponse.redirect(new URL(`/admin/${id}?done=1`, req.url), 303);
}
