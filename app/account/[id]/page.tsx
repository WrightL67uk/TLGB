import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { db, photoUrl } from '@/lib/supabase';
import { ownedBusiness, DOC_TYPE_LABEL } from '@/lib/account';
import AccountEditor from './AccountEditor';
import { expiryItems, daysUntil, fmtDate } from '@/lib/expiries';
import { isPaid, unverifiedReason, type Pending } from '@/lib/membership';
import { accreditationLabel } from '@/lib/config';
import { stripeEnabled } from '@/lib/stripe';
import { turnoverBand } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My listing | TLGB' };

const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB');

export default async function ListingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ paid?: string; billing?: string }> }) {
  const { id } = await params;
  const { paid: justPaid, billing: billingMsg } = await searchParams;
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
  const pend: Pending = b.pending_dates ?? {};
  const pendingList = [
    ...(pend.pl ? [`Public liability to ${fmtDate(pend.pl.expiry)}`] : []),
    ...(pend.el ? [pend.el.expiry ? `Employers liability to ${fmtDate(pend.el.expiry)}` : 'Employers liability'] : []),
    ...Object.entries(pend.acc ?? {}).map(([a, v]) => `${accreditationLabel(a)}${v ? ` to ${fmtDate(v)}` : ''}`),
  ];
  const reason = b.status === 'approved' ? unverifiedReason(b) : null;
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
        {reason === 'insurance' && (
          <p className="warn">
            Your insurance has expired, so your listing shows as <strong>Unverified</strong> and is hidden from anyone searching for verified members only.
            {pend.pl || pend.el ? ' We have your new details and will check the certificate shortly.' : ' Upload your new certificate under Documents and enter the new expiry date below.'}
          </p>
        )}
        {pendingList.length > 0 && (
          <p className="muted">Waiting for us to check the certificate: {pendingList.join('; ')}. These count on your listing once we have confirmed them, usually within two working days.</p>
        )}
        {plDays !== null && plDays >= 0 && plDays <= 30 && (
          <p className="warn">Your public liability insurance expires on {fmt(b.pl_expiry!)}. Upload your renewed certificate before then to stay listed.</p>
        )}
        {expiryItems(b).filter((i) => i.key !== 'public_liability').map((i) => {
          const days = daysUntil(i.expiry);
          if (days > 30) return null;
          return (
            <p className="warn" key={i.key}>
              {days < 0
                ? <>{i.label} expired on {fmtDate(i.expiry)}{i.key.startsWith('acc:') ? ', so it no longer shows on your listing' : ''}. Upload the renewed certificate under Documents and enter the new date below.</>
                : <>{i.label} expires on {fmtDate(i.expiry)}. Upload the renewed certificate under Documents and enter the new date below.</>}
            </p>
          );
        })}
      </section>

      {b.status === 'approved' && (
        <section className="panel membership-panel">
          <h2>Membership</h2>
          {justPaid && <p className="ok-box">Thank you. Your payment has gone through and your membership will show as active in a moment.</p>}
          {billingMsg && <p className="warn">{billingMsg}</p>}
          {b.founding_member ? (
            <p><span className="status approved">Founding member</span> Your listing and every member tool are free.</p>
          ) : isPaid(b) ? (
            <>
              <p>
                <span className="status approved">{b.subscription_status === 'trialing' ? 'Free trial' : b.subscription_status === 'past_due' ? 'Payment due' : 'Active'}</span>{' '}
                {b.paid_until && <>{b.subscription_status === 'trialing' ? 'Trial ends' : 'Renews'} on {fmt(b.paid_until)}.</>}
                {b.subscription_status === 'past_due' && <> Your last payment did not go through. Update your card to keep your listing live.</>}
              </p>
              {b.stripe_customer_id && (
                <form method="post" action="/api/billing/portal">
                  <input type="hidden" name="business_id" value={b.id} />
                  <button type="submit">Manage billing</button>
                  <span className="muted small"> Change your card, download invoices or cancel.</span>
                </form>
              )}
            </>
          ) : (
            <>
              <p>
                {b.subscription_status === 'cancelled' ? 'Renew your membership to show as verified again' : 'Your listing is approved. Start your membership to appear in search'} and get the full leads feed, the supply chain finder and the help board.
                {turnoverBand(b.turnover_band) && <> Your price is <strong>&pound;{turnoverBand(b.turnover_band)!.price} a year</strong> for the {turnoverBand(b.turnover_band)!.label} turnover band.</>}
              </p>
              {stripeEnabled() ? (
                <form method="post" action="/api/billing/checkout">
                  <input type="hidden" name="business_id" value={b.id} />
                  <button type="submit" className="primary">{b.subscription_status === 'cancelled' ? 'Renew membership' : 'Start membership'}</button>
                  <span className="muted small"> Secure card payment through Stripe. Renews yearly; cancel any time.</span>
                </form>
              ) : (
                <p className="muted">Online payment is not switched on yet. We will be in touch to set up your membership.</p>
              )}
              {b.subscription_status === 'cancelled' && <p className="warn">Your membership has ended, so your listing shows as <strong>Unverified</strong> and is hidden from anyone searching for verified members only. Renew to become verified again.</p>}
            </>
          )}
        </section>
      )}

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
          // The form shows what the trade last entered, including dates still waiting for our check
          accreditations: [...new Set([...b.accreditations, ...Object.keys(pend.acc ?? {})])],
          accreditation_expiries: { ...(b.accreditation_expiries ?? {}), ...Object.fromEntries(Object.entries(pend.acc ?? {}).filter(([, v]) => v)) } as Record<string, string>,
          turnover_band: b.turnover_band ?? '',
          pl_cover_amount: pend.pl?.cover ?? b.pl_cover_amount ?? '',
          pl_expiry: pend.pl?.expiry ?? b.pl_expiry ?? '',
          el_cover_amount: (pend.el ? pend.el.cover : b.el_cover_amount) ?? '',
          el_expiry: (pend.el ? pend.el.expiry : b.el_expiry) ?? '',
        }}
        docs={(docs ?? []).map((d) => ({ id: d.id, label: DOC_TYPE_LABEL[d.doc_type] ?? d.doc_type, fileName: d.file_name, date: fmt(d.created_at) }))}
        photos={(photos ?? []).map((p) => ({ id: p.id, url: photoUrl(p.storage_path) }))}
      />
    </div>
  );
}
