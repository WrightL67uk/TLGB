import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { isUuid, matchingMembers, companyEmails, type Job } from '@/lib/contractors';
import { tradeLabel } from '@/lib/config';
import { valueBandLabel } from '@/lib/contractorPlans';
import { emailJobAlert, emailTenderDecision } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 120;

// Behind the admin password (middleware). Approve a member's tender (it goes live and is emailed
// to matching members) or send it back with a reason.
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const back = NextResponse.redirect(new URL('/admin/tenders', req.url), 303);
  const id = String(fd?.get('id') ?? '');
  const action = String(fd?.get('action') ?? '');
  if (!fd || !isUuid(id)) return back;
  const { data } = await db().from('contractor_jobs').select('*').eq('id', id).eq('status', 'pending').maybeSingle();
  const job = data as Job | null;
  if (!job) return back;
  const { data: co } = await db().from('contractor_companies').select('name, business_id').eq('id', job.company_id).maybeSingle();
  const { data: poster } = co?.business_id ? await db().from('businesses').select('email, contact_name').eq('id', co.business_id).maybeSingle() : { data: null };
  const now = new Date().toISOString();

  if (action === 'approve') {
    const { data: claimed } = await db().from('contractor_jobs').update({ status: 'open', published_at: now, updated_at: now, rejection_reason: null }).eq('id', id).eq('status', 'pending').select('id');
    if (!claimed?.length) return back;
    const matches = (await matchingMembers(job)).filter((b) => b.job_alerts && b.id !== co?.business_id);
    const alert = {
      id: job.id, title: job.title, company: co?.name ?? 'A member', town: job.town, postcode: job.postcode,
      trades: job.trades.map(tradeLabel).join(', '), value: valueBandLabel(job.value_band), returnDate: job.return_date, startDate: job.start_date,
    };
    for (const b of matches.slice(0, 1000)) await emailJobAlert(b.email, b.contact_name, b.trading_name, alert, false);
    await db().from('contractor_jobs').update({ notified_count: matches.length }).eq('id', id);
    const to = poster?.email ?? (await companyEmails(job.company_id))[0];
    if (to && co?.business_id) await emailTenderDecision(to, poster?.contact_name ?? 'there', { id, title: job.title, businessId: co.business_id }, true, matches.length, null);
  } else if (action === 'reject') {
    const reason = String(fd.get('reason') ?? '').trim().slice(0, 500) || null;
    await db().from('contractor_jobs').update({ status: 'draft', rejection_reason: reason, updated_at: now }).eq('id', id).eq('status', 'pending');
    if (poster?.email && co?.business_id) await emailTenderDecision(poster.email, poster.contact_name, { id, title: job.title, businessId: co.business_id }, false, 0, reason);
  }
  return back;
}
