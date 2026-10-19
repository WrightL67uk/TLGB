import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { db, photoUrl } from '@/lib/supabase';
import { ownedBusiness, DOC_TYPE_LABEL } from '@/lib/account';
import AccountEditor from './AccountEditor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My listing | TLGB' };

const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB');

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const own = await ownedBusiness(id);
  if (!own.ok) {
    if (own.status === 401) redirect('/login');
    notFound();
  }
  const b = own.business;

  const [{ data: docs }, { data: photos }, { count: listingCount }] = await Promise.all([
    db().from('business_documents').select('id, doc_type, file_name, created_at').eq('business_id', b.id).order('created_at', { ascending: false }),
    db().from('business_photos').select('id, storage_path').eq('business_id', b.id).order('sort_order'),
    db().from('businesses').select('id', { count: 'exact', head: true }).eq('email', own.email).neq('status', 'draft'),
  ]);

  const today = new Date();
  const plDays = b.pl_expiry ? Math.ceil((new Date(b.pl_expiry).getTime() - today.getTime()) / 86_400_000) : null;

  return (
    <div className="narrow">
      <div className="account-head">
        <div>
          {(listingCount ?? 0) > 1 && <p className="small"><Link href="/account">All my listings</Link></p>}
          <h1>{b.trading_name}</h1>
        </div>
        <form action="/api/auth/logout" method="post"><button type="submit">Log out</button></form>
      </div>

      <section className="panel status-panel">
        {b.status === 'approved' && (
          <p><span className="status approved">Live</span> Your listing is showing in search.{' '}
            <Link href={`/b/${b.id}`}>View your public page</Link></p>
        )}
        {b.status === 'pending_review' && (
          <p><span className="status pending_review">Waiting for approval</span> We check every business by hand, usually within two working days.</p>
        )}
        {b.status === 'rejected' && (
          <>
            <p><span className="status rejected">Not approved</span> {b.rejection_reason ? <>Reason: {b.rejection_reason}</> : null}</p>
            <p>Fix the problem below and save. Your listing then comes back to us for another look.</p>
          </>
        )}
        {b.status === 'suspended' && (
          <p><span className="status suspended">Suspended</span> Your listing is hidden. Reply to any of our emails to sort it out.</p>
        )}
        {b.status === 'approved' && b.recheck_required && (
          <p className="muted">We are checking your recent changes. Your listing stays live while we do.</p>
        )}
        {plDays !== null && plDays < 0 && (
          <p className="warn">Your public liability insurance expired on {fmt(b.pl_expiry!)}, so your listing is hidden from search. Upload your new certificate and update the expiry date.</p>
        )}
        {plDays !== null && plDays >= 0 && plDays <= 30 && (
          <p className="warn">Your public liability insurance expires on {fmt(b.pl_expiry!)}. Upload your renewed certificate before then to stay listed.</p>
        )}
      </section>

      <AccountEditor
        b={{
          id: b.id,
          status: b.status,
          business_type: b.business_type,
          company_number: b.company_number,
          email: b.email,
          trading_name: b.trading_name,
          contact_name: b.contact_name,
          phone: b.phone,
          website: b.website ?? '',
          business_address: b.business_address ?? '',
          description: b.description ?? '',
          base_postcode: b.base_postcode,
          radius_miles: b.radius_miles,
          trades: b.trades,
          accreditations: b.accreditations,
          turnover_band: b.turnover_band ?? '',
          pl_cover_amount: b.pl_cover_amount ?? '',
          pl_expiry: b.pl_expiry ?? '',
          el_cover_amount: b.el_cover_amount ?? '',
          el_expiry: b.el_expiry ?? '',
        }}
        docs={(docs ?? []).map((d) => ({ id: d.id, label: DOC_TYPE_LABEL[d.doc_type] ?? d.doc_type, fileName: d.file_name, date: fmt(d.created_at) }))}
        photos={(photos ?? []).map((p) => ({ id: p.id, url: photoUrl(p.storage_path) }))}
      />
    </div>
  );
}
