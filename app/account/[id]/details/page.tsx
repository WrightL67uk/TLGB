import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ownedBusiness } from '@/lib/account';
import { planChosen } from '@/lib/membership';
import { getPricing } from '@/lib/pricing';
import JoinSteps from '@/app/join/JoinSteps';
import DetailsForm, { type Saved } from './DetailsForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your details | TLGB' };

/** Step 3 of the quick sign-up: the rest of the details, saved as they type, then Send for approval. */
export default async function DetailsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ paid?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const own = await ownedBusiness(id);
  if (!own.ok) {
    if (own.status === 401) redirect(`/login?next=/account/${id}/details`);
    notFound();
  }
  const b = own.business;
  if (b.status !== 'started') redirect(`/account/${b.id}`);
  const pricing = await getPricing();
  if (pricing.mode === 'membership' && !planChosen(b) && sp.paid !== '1') redirect(`/account/${b.id}/plan`);

  const saved: Saved = { trading_name: b.trading_name, ...((b.draft_data as Saved | null) ?? {}) };
  const paid = sp.paid === '1' || ['active', 'trialing'].includes(b.subscription_status);
  return (
    <div className="narrow">
      <JoinSteps on="details" free={!!b.free_listing} />
      <h1>Your details</h1>
      {paid ? (
        <p className="ok-box">
          <strong>You&rsquo;re in.</strong> Your membership is set up. Add your details below and send them to us: the sooner we check them,
          the sooner you&rsquo;re live with the Verified badge and getting leads and contractor jobs.
        </p>
      ) : b.free_listing ? (
        <p className="ok-box">
          <strong>Free listing chosen.</strong> Add your details and send them to us to check. You can{' '}
          <Link href={`/account/${b.id}/plan`}>go verified</Link> at any time.
        </p>
      ) : (
        <p className="lead">Add your details and send them to us to check.</p>
      )}
      <DetailsForm
        id={b.id}
        businessType={b.business_type as 'ltd' | 'sole_trader'}
        company={b.company_number ? { name: b.ch_company_name ?? b.trading_name, number: b.company_number, address: b.ch_registered_address ?? '' } : null}
        email={b.email}
        saved={saved}
      />
    </div>
  );
}
