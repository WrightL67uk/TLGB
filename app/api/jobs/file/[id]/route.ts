import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { getSessionEmail } from '@/lib/session';
import { contractorByEmail, isUuid, memberAccess } from '@/lib/contractors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Downloads a job drawing: for the contractor's own team, paying members, or invited trades. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return new NextResponse('Not found', { status: 404 });
  const email = await getSessionEmail();
  if (!email) return NextResponse.redirect(new URL('/login?next=/jobs', req.url), 303);

  const { data: f } = await db().from('contractor_job_files').select('id, job_id, storage_path, file_name').eq('id', id).maybeSingle();
  if (!f) return new NextResponse('Not found', { status: 404 });
  const { data: job } = await db().from('contractor_jobs').select('id, company_id, status').eq('id', f.job_id).maybeSingle();
  if (!job || job.status === 'removed') return new NextResponse('Not found', { status: 404 });

  const me = await contractorByEmail(email);
  let allowed = me?.company.id === job.company_id;
  if (!allowed && job.status !== 'draft') {
    const { paidListing, invitedListing } = await memberAccess(email, job.id);
    allowed = !!(paidListing || invitedListing);
  }
  if (!allowed) return NextResponse.redirect(new URL(`/jobs/${job.id}`, req.url), 303);

  const { data } = await db().storage.from('contractor-jobs').createSignedUrl(f.storage_path, 120, { download: f.file_name });
  if (!data?.signedUrl) return new NextResponse('Could not open the file', { status: 500 });
  return NextResponse.redirect(data.signedUrl, 303);
}
