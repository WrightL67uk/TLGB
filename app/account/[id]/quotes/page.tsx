import Link from 'next/link';
import UpgradePanel from '@/app/UpgradePanel';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/supabase';
import { ownedBusiness } from '@/lib/account';
import { isPaid } from '@/lib/membership';
import { gbp, statusText, type QRequest } from '@/lib/quotes';
import '../../../quotes.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Price requests | TLGB' };

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' });

export default async function QuotesList({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const own = await ownedBusiness(id);
  if (!own.ok) {
    if (own.status === 401) redirect(`/login?next=/account/${id}/quotes`);
    notFound();
  }
  const b = own.business;
  const paid = isPaid(b);
  const { data } = await db().from('quote_requests').select('*').eq('business_id', b.id).order('created_at', { ascending: false }).limit(200);
  const requests = (data ?? []) as QRequest[];
  const { data: inv } = requests.length
    ? await db().from('quote_invites').select('request_id, status, goods_total, delivery_charge').in('request_id', requests.map((r) => r.id))
    : { data: [] };

  return (
    <div className="qt">
      <p className="small"><Link href={`/account/${b.id}`}>Back to my listing</Link></p>
      <h1>Price requests</h1>
      <p className="lead">Send one list of plants or materials to several suppliers, get their prices back on one page, and pick the best deal.</p>
      {!paid ? (
        <UpgradePanel b={b} feature="Sending price requests to suppliers" />
      ) : (
        <p><Link href={`/account/${b.id}/quotes/new`} className="sq sq-rust">New price request</Link></p>
      )}

      {!requests.length && paid && (
        <div className="panel">
          <p><b>How it works</b></p>
          <p>1. Type or paste your list: plant names, sizes and quantities, or materials.<br />
            2. We pick suppliers that stock it and deliver to your site. Untick any you do not want.<br />
            3. They price it online. You see every price side by side, with delivery, and accept the one you want.</p>
        </div>
      )}

      <div className="qt-list" style={{ marginTop: 16 }}>
        {requests.map((r) => {
          const mine = (inv ?? []).filter((i) => i.request_id === r.id);
          const quoted = mine.filter((i) => ['quoted', 'won', 'lost'].includes(i.status));
          const totals = quoted.map((q) => Number(q.goods_total ?? 0) + Number(q.delivery_charge ?? 0)).filter((n) => n > 0);
          const st = statusText(r);
          return (
            <Link key={r.id} href={`/account/${b.id}/quotes/${r.id}`} className="qt-card">
              <h3>{r.reference} <span className={`qt-status ${st.cls}`}>{st.label}</span></h3>
              <div className="qt-meta">
                <span>Sent <b>{day(r.created_at)}</b></span>
                <span>To <b>{r.postcode}</b></span>
                <span><b>{quoted.length}</b> of {mine.length} priced</span>
                {totals.length > 0 && <span>Lowest <b>{gbp(Math.min(...totals))}</b></span>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
