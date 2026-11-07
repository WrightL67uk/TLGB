import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ownedBusiness } from '@/lib/account';
import { isPaid } from '@/lib/membership';
import QuoteForm from './QuoteForm';
import '../../../../quotes.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'New price request | TLGB' };

export default async function NewQuote({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const own = await ownedBusiness(id);
  if (!own.ok) {
    if (own.status === 401) redirect(`/login?next=/account/${id}/quotes/new`);
    notFound();
  }
  const b = own.business;
  if (!isPaid(b)) redirect(`/account/${b.id}/quotes`);
  return (
    <div className="qt">
      <p className="small"><Link href={`/account/${b.id}/quotes`}>Back to price requests</Link></p>
      <h1>New price request</h1>
      <p className="lead">One list, several suppliers, every price on one page.</p>
      <QuoteForm businessId={b.id} basePostcode={b.base_postcode} />
    </div>
  );
}
