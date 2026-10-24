import { notFound, redirect } from 'next/navigation';
import { getContractor, ownJob } from '@/lib/contractors';
import ContractorNav from '../../../ContractorNav';
import JobForm from '../../JobForm';
import '../../../../contractor.css';
import '../../../../resources.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit job | TLGB' };

export default async function EditJob({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const me = await getContractor();
  const { id } = await params;
  if (!me) redirect(`/login?next=/contractor/jobs/${id}/edit`);
  const job = await ownJob(me, id);
  if (!job) notFound();
  const { error } = await searchParams;
  return (
    <div className="ct-page">
      <ContractorNav me={me} on="jobs" />
      <h2>Edit job</h2>
      {job.status !== 'draft' && <p className="muted">Trades who were already emailed will see the changes when they open the job. We do not email them again.</p>}
      <JobForm job={job} contact={{ name: me.user.name, email: me.user.email }} error={error} />
    </div>
  );
}
