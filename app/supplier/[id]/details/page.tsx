import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ownedSupplier, photosFor, isSubscribed } from '@/lib/supplierAccount';
import { photoUrl } from '@/lib/supabase';
import SupplierDetails from './SupplierDetails';
import '../../../resources.css';
import '../../../suppliers/supplier.css';
import '../../../plans.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your supplier details | TLGB' };

export default async function SupplierDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const own = await ownedSupplier(id);
  if (!own.ok) {
    if (own.status === 401) redirect(`/login?next=/supplier/${id}/details`);
    notFound();
  }
  const s = own.supplier;
  if (s.status === 'rejected') redirect(`/supplier/${s.id}`);
  const photos = (await photosFor(s.id)).map((p) => ({ id: p.id, url: photoUrl(p.storage_path), caption: p.caption ?? '' }));
  const started = s.status === 'started';
  return (
    <div className="narrow">
      {started && (
        <ol className="join-steps" aria-label="Sign-up steps">
          {['Choose your plan', 'Your account', 'Payment', 'Your details', 'Send for approval'].map((x, i) => <li key={x} className={i === 3 ? 'on' : ''}>{i + 1}. {x}</li>)}
        </ol>
      )}
      <p className="small"><Link href={`/supplier/${s.id}`}>&larr; Back to my supplier account</Link></p>
      <h1>{started ? 'Tell buyers about your business' : 'Your profile'}</h1>
      <p className="muted">
        This is what contractors see on your company profile, and what we use to match you to price requests.
        {started && ' You can come back and finish later: nothing is sent to us until you press the last button.'}
      </p>
      {started && !isSubscribed(s) && <p className="err big">Your payment has not come through yet. You can fill this in now, but you need to <Link href={`/supplier/${s.id}`}>complete payment</Link> before you can send it.</p>}
      <SupplierDetails
        supplier={{
          id: s.id, status: s.status, name: s.name, contact_name: s.contact_name ?? '', phone: s.phone ?? '', public_email: s.public_email ?? '',
          email: s.email ?? '', website: s.website ?? '', address: s.address ?? '', town: s.town ?? '', postcode: s.postcode ?? '',
          delivers_nationally: s.delivers_nationally, categories: s.categories, description: s.description ?? '', about: s.about ?? '',
          year_established: s.year_established ? String(s.year_established) : '', delivery_options: s.delivery_options, min_order: s.min_order ?? '',
          trade_accounts: s.trade_accounts, trade_only: s.trade_only, standards: s.standards, standards_other: s.standards_other ?? '',
          product_liability: s.product_liability, tier: s.tier,
        }}
        logoUrl={s.logo_path ? photoUrl(s.logo_path) : null}
        photos={photos}
      />
    </div>
  );
}
