import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { getSessionEmail, sameOrigin } from '@/lib/session';
import { isUuid } from '@/lib/contractors';
import { emailAdminJobReport } from '@/lib/email';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const jobId = String(fd?.get('job_id') ?? '');
  if (!isUuid(jobId)) return NextResponse.redirect(new URL('/jobs', req.url), 303);
  const email = await getSessionEmail();
  if (!sameOrigin(req) || !email) return NextResponse.redirect(new URL(`/jobs/${jobId}`, req.url), 303);
  const reason = String(fd?.get('reason') ?? '').trim().slice(0, 500);
  const { count } = await db().from('contractor_job_reports').select('id', { count: 'exact', head: true }).eq('job_id', jobId).eq('email', email);
  const { data: job } = await db().from('contractor_jobs').select('id, title').eq('id', jobId).maybeSingle();
  if (job && !count) {
    await db().from('contractor_job_reports').insert({ job_id: jobId, email, reason: reason || null });
    await emailAdminJobReport(job, email, reason);
  }
  return NextResponse.redirect(new URL(`/jobs/${jobId}?reported=1`, req.url), 303);
}
