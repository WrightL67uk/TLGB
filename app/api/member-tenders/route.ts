import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { getSessionEmail, sameOrigin } from '@/lib/session';
import { memberMe, ownJob, isUuid } from '@/lib/contractors';
import { emailAdminTenderToApprove } from '@/lib/email';
import { sectorLabel } from '@/lib/contractors';

export const runtime = 'nodejs';

// Small actions on a member's own tenders. A tender never goes live from here: "submit" only
// sends it to admin for approval.
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const bid = String(fd?.get('business_id') ?? '');
  const jobId = String(fd?.get('job_id') ?? '');
  const list = `/account/${isUuid(bid) ? bid : ''}/tenders`;
  const go = (q = '', to = jobId && isUuid(jobId) ? `${list}/${jobId}` : list) => NextResponse.redirect(new URL(`${to}${q}`, req.url), 303);
  const fail = (m: string) => go(`?error=${encodeURIComponent(m)}`);
  if (!sameOrigin(req) || !fd) return fail('Please use the buttons on our website.');
  const email = await getSessionEmail();
  const me = email ? await memberMe(bid, email) : null;
  if (!me) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(list)}`, req.url), 303);
  const job = await ownJob(me, jobId);
  if (!job) return fail('That tender could not be found.');
  const action = String(fd.get('action') ?? '');
  const now = new Date().toISOString();
  const jobs = () => db().from('contractor_jobs');

  if (action === 'submit') {
    if (job.status !== 'draft') return go();
    const { count } = await jobs().select('id', { count: 'exact', head: true }).eq('company_id', me.company.id).in('status', ['pending', 'open']);
    if ((count ?? 0) >= 10) return fail('You have 10 tenders open or waiting. Close one first.');
    const { data: claimed } = await jobs().update({ status: 'pending', rejection_reason: null, updated_at: now }).eq('id', job.id).eq('status', 'draft').select('id');
    if (claimed?.length) await emailAdminTenderToApprove({ title: job.title, poster: me.company.name, sector: sectorLabel(job.sector) });
    return go('', list + '?sent=1');
  }
  if (action === 'close') {
    if (job.status === 'open') await jobs().update({ status: 'closed', updated_at: now }).eq('id', job.id);
    return go();
  }
  if (action === 'reopen') {
    if (job.status !== 'closed') return go();
    if (job.return_date && job.return_date < now.slice(0, 10)) return fail('Change the reply-by date before reopening. Post a new tender if you need to.');
    await jobs().update({ status: 'open', updated_at: now }).eq('id', job.id);
    return go();
  }
  if (action === 'delete') {
    if (job.status === 'draft' || job.status === 'pending') await jobs().delete().eq('id', job.id);
    return go('', list);
  }
  if (action === 'reply-status' || action === 'reply-note') {
    const rid = String(fd.get('reply_id') ?? '');
    if (!isUuid(rid)) return go();
    const { data: r } = await db().from('contractor_job_replies').select('id').eq('id', rid).eq('job_id', job.id).maybeSingle();
    if (!r) return go();
    if (action === 'reply-status') {
      const status = String(fd.get('status') ?? '');
      if (['new', 'shortlisted', 'declined'].includes(status)) await db().from('contractor_job_replies').update({ status }).eq('id', rid);
    } else {
      await db().from('contractor_job_replies').update({ contractor_note: String(fd.get('note') ?? '').trim().slice(0, 2000) || null }).eq('id', rid);
    }
    return go();
  }
  return fail('Unknown action.');
}
