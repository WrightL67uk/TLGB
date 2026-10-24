import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { getSessionEmail, sameOrigin } from '@/lib/session';
import { isPaid } from '@/lib/membership';
import { isUuid, jobIsOpen, memberAccess, companyEmails, type Job } from '@/lib/contractors';
import { newToken } from '@/lib/compliance';
import { CATEGORY_KEYS } from '@/lib/complianceTypes';
import { emailContractorNewReply } from '@/lib/email';

export const runtime = 'nodejs';

/** A member (or an invited trade) says they are interested, optionally with their pack attached. */
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const jobId = String(fd?.get('job_id') ?? '');
  if (!isUuid(jobId)) return NextResponse.redirect(new URL('/jobs', req.url), 303);
  const go = (q: string) => NextResponse.redirect(new URL(`/jobs/${jobId}?${q}`, req.url), 303);
  if (!sameOrigin(req) || !fd) return go('error=Please+use+the+form+on+our+website.');
  const email = await getSessionEmail();
  if (!email) return NextResponse.redirect(new URL(`/login?next=/jobs/${jobId}`, req.url), 303);

  const { data } = await db().from('contractor_jobs').select('*').eq('id', jobId).maybeSingle();
  const job = data as Job | null;
  if (!job || !jobIsOpen(job)) return go('error=This+job+is+closed.');
  const { paidListing, invitedListing } = await memberAccess(email, jobId);
  const wanted = String(fd.get('business_id') ?? '');
  const as = [paidListing, invitedListing].find((b) => b && b.id === wanted) ?? paidListing ?? invitedListing;
  if (!as) return go('error=Only+members+and+invited+trades+can+reply.');

  const message = String(fd.get('message') ?? '').trim().slice(0, 2000) || null;
  const { data: company } = await db().from('contractor_companies').select('name').eq('id', job.company_id).maybeSingle();

  // Attach the pack: a share link the member can see and switch off on their pack page
  let packLinkId: string | null = null;
  if (fd.get('share_pack') === 'on' && isPaid(as)) {
    const label = `${company?.name ?? 'Contractor'}: ${job.title}`.slice(0, 80);
    for (let attempt = 0; attempt < 3 && !packLinkId; attempt++) {
      const { data: link, error } = await db().from('pack_links').insert({
        business_id: as.id, token: newToken(company?.name ?? 'job'), label, include: [...CATEGORY_KEYS, 'profile'],
        expires_at: new Date(Date.now() + 180 * 86_400_000).toISOString(),
      }).select('id').single();
      if (link) packLinkId = link.id;
      else if (error?.code !== '23505') break;
    }
  }

  const { error } = await db().from('contractor_job_replies').insert({
    job_id: job.id, business_id: as.id, replied_by: email, message, pack_link_id: packLinkId,
  });
  if (error?.code === '23505') return go('sent=1');
  if (error) {
    console.error('job reply failed', error);
    return go('error=Could+not+send.+Try+again.');
  }
  await emailContractorNewReply(await companyEmails(job.company_id), { id: job.id, title: job.title }, as.trading_name, message);
  return go('sent=1');
}
