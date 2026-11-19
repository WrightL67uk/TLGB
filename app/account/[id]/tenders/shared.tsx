import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ownedBusiness } from '@/lib/account';
import { memberMe, type Me } from '@/lib/contractors';
import '../../../contractor.css';
import '../../../resources.css';

/** Loads the logged-in member and their hidden tender account, or redirects/404s. */
export async function loadMember(id: string, path: string): Promise<{ me: Me; name: string; id: string }> {
  const own = await ownedBusiness(id);
  if (!own.ok) {
    if (own.status === 401) redirect(`/login?next=${path}`);
    notFound();
  }
  if (own.business.status !== 'approved') redirect(`/account/${id}`);
  const me = await memberMe(id, own.email);
  if (!me) notFound();
  return { me, name: own.business.trading_name, id };
}

export function TenderHead({ id, name }: { id: string; name: string }) {
  return (
    <>
      <p className="muted small"><Link href={`/account/${id}`}>&larr; {name}</Link></p>
      <h1>Your tenders</h1>
      <nav className="ct-nav">
        <Link href={`/account/${id}/tenders`}>Your tenders</Link>
        <Link href={`/account/${id}/tenders/new`}>Post a tender</Link>
        <Link href="/jobs">Tenders from others</Link>
      </nav>
    </>
  );
}
