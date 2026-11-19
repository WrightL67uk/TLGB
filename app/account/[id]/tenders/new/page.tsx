import JobForm from '@/app/contractor/jobs/JobForm';
import { ownedBusiness } from '@/lib/account';
import { loadMember, TenderHead } from '../shared';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Post a tender | TLGB' };

export default async function NewMemberTender({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const { me, name } = await loadMember(id, `/account/${id}/tenders/new`);
  const own = await ownedBusiness(id);
  const contact = own.ok ? { name: own.business.contact_name, email: own.business.email } : { name: me.user.name, email: me.user.email };
  return (
    <div className="ct-page">
      <TenderHead id={id} name={name} />
      <h2>Post a tender</h2>
      <p className="muted">Describe the work. We check it, then every member who does the trade, covers the site and meets your requirements is emailed.</p>
      <JobForm contact={contact} error={error} businessId={id} />
    </div>
  );
}
