import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { addCredits, cleanAgencyPlan, creditBalance, saveAgencyPlan } from '@/lib/agencies';
import { agencyPaid, refundAgency } from '@/lib/agencyCheckout';
import { VACANCY_LIVE_DAYS } from '@/lib/vacancies';
import { alertSeekersAboutVacancy } from '@/lib/recruitJob';
import { emailAgencyDecision, emailAgencyVacancyDecision } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 120;

const isId = (s: string) => /^[0-9a-f-]{36}$/.test(s);

// Behind the admin login (middleware). Approve or turn down agencies and their vacancies, adjust credits, save plan settings.
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const to = (q: string) => NextResponse.redirect(new URL(`/admin/agencies?${q}`, req.url), 303);
  if (!fd || !sameOrigin(req)) return to('error=Please+use+the+form');
  const action = String(fd.get('action') ?? '');
  const id = String(fd.get('id') ?? '');
  const reason = String(fd.get('reason') ?? '').trim().slice(0, 500) || null;

  if (action === 'settings') {
    const p = cleanAgencyPlan({
      price: fd.get('price'), credits: fd.get('credits'), per_referral_credit: fd.get('per_referral_credit'), referral_cap: fd.get('referral_cap'),
    });
    const { error } = await saveAgencyPlan(p);
    return error ? to('error=Could+not+save') : to('done=1');
  }

  if (!isId(id)) return to('error=Not+found');

  if (action === 'approve' || action === 'reject' || action === 'suspend') {
    const { data: a } = await db().from('agencies').select('id, name, email, contact_name, status, subscription_status, stripe_subscription_id').eq('id', id).maybeSingle();
    if (!a) return to('error=Not+found');
    if (action === 'approve' && !agencyPaid(a.subscription_status)) return to('error=This+agency+has+not+paid+yet');
    const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'suspended';
    await db().from('agencies').update({
      status,
      rejection_reason: action === 'reject' ? reason : null,
      ...(action === 'approve' ? { approved_at: new Date().toISOString() } : {}),
    }).eq('id', id);
    if (action === 'reject' && a.status !== 'rejected') {
      const note = await refundAgency(a);
      const bal = await creditBalance(id);
      if (bal > 0) await addCredits(id, -bal, 'refund-plan', `${Date.now()}`, 'Plan refunded');
      await db().from('agencies').update({ admin_notes: note }).eq('id', id);
    }
    if (action !== 'suspend' && a.status !== status) await emailAgencyDecision(a.email, a.contact_name, a.name, action === 'approve', reason).catch(() => null);
    return to('done=1');
  }

  if (action === 'credits') {
    const amount = Math.round(Number(fd.get('amount')));
    if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 1000) return to('error=Enter+a+number+of+credits');
    await addCredits(id, amount, 'admin', `${Date.now()}`, 'Added by admin');
    return to('done=1');
  }

  if (action === 'vacancy-approve' || action === 'vacancy-reject') {
    const { data: v } = await db().from('vacancies').select('id, title, status, agency_id, agencies(email, contact_name)').eq('id', id).maybeSingle();
    const ag = (v as unknown as { agencies: { email: string; contact_name: string } | null } | null)?.agencies;
    if (!v || v.status !== 'pending' || !v.agency_id) return to('error=That+vacancy+is+not+waiting');
    if (action === 'vacancy-approve') {
      const now = new Date();
      await db().from('vacancies').update({
        status: 'live', approved_at: now.toISOString(), rejection_reason: null,
        expires_at: new Date(now.getTime() + VACANCY_LIVE_DAYS * 86_400_000).toISOString(), updated_at: now.toISOString(),
      }).eq('id', v.id);
      if (ag) await emailAgencyVacancyDecision(ag.email, ag.contact_name, v.title, true, v.id).catch(() => null);
      await alertSeekersAboutVacancy(v.id).catch((e) => console.error('vacancy alerts failed', e));
    } else {
      await db().from('vacancies').update({ status: 'rejected', rejection_reason: reason, updated_at: new Date().toISOString() }).eq('id', v.id);
      await addCredits(v.agency_id, 1, 'refund', `${v.id}:${Date.now()}`, 'Vacancy not approved');
      if (ag) await emailAgencyVacancyDecision(ag.email, ag.contact_name, v.title, false, v.id, reason).catch(() => null);
    }
    return to('done=1#vacancies');
  }
  return to('error=Unknown+action');
}
