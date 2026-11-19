import { notFound, redirect } from 'next/navigation';
import JobForm from '@/app/contractor/jobs/JobForm';
import { ownJob } from '@/lib/contractors';
import { loadMember, TenderHead } from '../../shared';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit tender | TLGB' };

export default async function EditMemberTender({ params, searchParams }: { params: Promise<{ id: string; jobId: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id, jobId } = await params;
  const { error } = await searchParams;
  const { me, name } = await loadMember(id, `/account/${id}/tenders/${jobId}/edit`);
  const job = await ownJob(me, jobId);
  if (!job) notFound();
  if (job.status !== 'draft') redirect(`/account/${id}/tenders/${jobId}`);
  return (
    <div className="ct-page">
      <TenderHead id={id} name={name} />
      <h2>Edit tender</h2>
      <JobForm job={job} contact={{ name: me.user.name, email: me.user.email }} error={error} businessId={id} />
    </div>
  );
}
