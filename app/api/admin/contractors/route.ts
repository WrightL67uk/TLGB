import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { PLANS } from '@/lib/contractorPlans';
import { emailContractorDecision } from '@/lib/email';

export const runtime = 'nodejs';

// Behind the admin password (middleware). Approve, reject or suspend contractors, change their
// plan, and take jobs down.
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const action = String(fd?.get('action') ?? '');
  const id = String(fd?.get('id') ?? '');
  const back = NextResponse.redirect(new URL('/admin/contractors', req.url), 303);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return back;

  if (action === 'job-remove' || action === 'job-restore') {
    await db().from('contractor_jobs').update({ status: action === 'job-remove' ? 'removed' : 'closed' }).eq('id', id);
    return back;
  }

  const { data: c } = await db().from('contractor_companies').select('id, name, status').eq('id', id).maybeSingle();
  if (!c) return back;
  const { data: owner } = await db().from('contractor_users').select('email, name').eq('company_id', id).eq('role', 'owner').is('removed_at', null).order('created_at').limit(1).maybeSingle();

  if (action === 'approve') {
    await db().from('contractor_companies').update({ status: 'approved', approved_at: new Date().toISOString(), rejection_reason: null }).eq('id', id);
    if (owner && c.status === 'pending') await emailContractorDecision(owner.email, owner.name, c.name, true);
  } else if (action === 'reject') {
    const reason = String(fd?.get('reason') ?? '').trim().slice(0, 500) || null;
    await db().from('contractor_companies').update({ status: 'rejected', rejection_reason: reason }).eq('id', id);
    if (owner) await emailContractorDecision(owner.email, owner.name, c.name, false, reason);
  } else if (action === 'suspend') {
    await db().from('contractor_companies').update({ status: 'suspended' }).eq('id', id);
  } else if (action === 'unsuspend') {
    await db().from('contractor_companies').update({ status: 'approved' }).eq('id', id);
  } else if (action === 'plan') {
    const plan = String(fd?.get('plan') ?? '');
    if (plan in PLANS) await db().from('contractor_companies').update({ plan }).eq('id', id);
  } else if (action === 'founding') {
    await db().from('contractor_companies').update({ founding: fd?.get('on') === '1' }).eq('id', id);
  }
  return back;
}
