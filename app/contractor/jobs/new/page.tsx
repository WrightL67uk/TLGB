import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getContractor } from '@/lib/contractors';
import ContractorNav from '../../ContractorNav';
import JobForm from '../JobForm';
import '../../../contractor.css';
import '../../../resources.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Post a job | TLGB' };

export default async function NewJob({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await getContractor();
  if (!me) redirect('/login?next=/contractor/jobs/new');
  const { error } = await searchParams;
  return (
    <div className="ct-page">
      <ContractorNav me={me} on="jobs" />
      <h2>Post a job</h2>
      {me.company.status !== 'approved'
        ? <p className="ct-banner">You can write a job now and send it once your company is approved.</p>
        : <p className="muted">Describe the package. When you send it, every member who does this trade, covers the site and meets your requirements gets an email. <Link href="/legal/contractor-terms">What you can post</Link>.</p>}
      <JobForm contact={{ name: me.user.name, email: me.user.email }} error={error} />
    </div>
  );
}
