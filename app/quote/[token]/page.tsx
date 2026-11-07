import Link from 'next/link';
import { db } from '@/lib/supabase';
import { loadInviteByToken, isOpen, gbp, qtyText, goodsTotal } from '@/lib/quotes';
import { quoteCategoryLabel, rootLabel } from '@/lib/quoteTypes';
import PriceForm from './PriceForm';
import '../../quotes.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Price request | The Little Green Book', robots: { index: false, follow: false } };

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { timeZone: 'Europe/London', weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });
const day = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

type SP = Promise<{ saved?: string; declined?: string; error?: string }>;

export default async function SupplierQuote({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: SP }) {
  const { token } = await params;
  const sp = await searchParams;
  const v = await loadInviteByToken(token);
  if (!v) {
    return (
      <div className="narrow">
        <h1>Link not recognised</h1>
        <p>This price request link is not valid. Please use the button in the email we sent you, or contact <a href="mailto:admin@tlgb.co.uk">admin@tlgb.co.uk</a>.</p>
      </div>
    );
  }
  if (v.expired) {
    return (
      <div className="narrow">
        <h1>This request has finished</h1>
        <p>The price request <strong>{v.request.reference}</strong> is no longer open.</p>
      </div>
    );
  }
  const { invite, request, lines, prices, supplier } = v;
  if (!invite.viewed_at) await db().from('quote_invites').update({ viewed_at: new Date().toISOString() }).eq('id', invite.id);
  const { data: buyer } = await db().from('businesses').select('trading_name').eq('id', request.business_id).maybeSingle();
  const open = isOpen(request) && invite.status !== 'won' && invite.status !== 'lost';
  const detail = (l: (typeof lines)[number]) => [l.spec, rootLabel(l.root), l.category !== 'trees-plants' ? quoteCategoryLabel(l.category) : ''].filter(Boolean).join(', ');
  const priceFor = (id: string) => prices.find((p) => p.line_id === id);

  return (
    <div className="qt">
      <p className="small muted">The Little Green Book · you are pricing as <b>{supplier.name}</b></p>
      <h1>{buyer?.trading_name ?? 'A member'} would like prices</h1>
      <div className="qt-meta" style={{ marginBottom: 16 }}>
        <span>Reference: <b>{request.reference}</b></span>
        <span>Deliver to: <b>{request.area ?? request.postcode.split(' ')[0]}</b> area</span>
        {request.needed_by && <span>Needed by: <b>{day(request.needed_by)}</b></span>}
        <span>Prices wanted by: <b>{when(request.closes_at)}</b></span>
      </div>
      {request.delivery_notes && <div className="panel"><p><b>Delivery notes:</b> {request.delivery_notes}</p></div>}

      {sp.saved && <p className="ok-box">Thank you, {supplier.name}. Your prices are now with the buyer, {buyer?.trading_name ?? 'who asked for them'}, and we have emailed them to say so. You can change your prices here until the deadline.</p>}
      {sp.error && <p className="err big">{sp.error}</p>}

      {invite.status === 'won' && <p className="ok-box"><b>Your prices were accepted.</b> We have emailed you the buyer&apos;s contact details so you can confirm the order.</p>}
      {invite.status === 'lost' && <p className="panel">The buyer went with another supplier this time. Thank you for pricing.</p>}
      {invite.status === 'declined' && (
        <div className="panel">
          <p>You told the buyer you cannot quote for this one{invite.decline_reason ? `: "${invite.decline_reason}"` : ''}.</p>
          {open && (
            <form method="post" action={`/api/quote/${encodeURIComponent(token)}`}>
              <input type="hidden" name="action" value="undecline" />
              <button className="qt-btn small" type="submit">Price it after all</button>
            </form>
          )}
        </div>
      )}

      {open && invite.status !== 'declined' && (
        <>
          <PriceForm
            token={token}
            lines={lines.map((l) => ({ id: l.id, item: l.item, detail: detail(l), qty: l.qty, unit: l.unit, notes: l.notes }))}
            start={Object.fromEntries(lines.map((l) => {
              const p = priceFor(l.id);
              return [l.id, { available: p?.available ?? 'yes', unit_price: p?.unit_price != null ? String(p.unit_price) : '', substitute: p?.substitute ?? '', note: p?.note ?? '' }];
            }))}
            delivery={invite.delivery_charge != null ? String(invite.delivery_charge) : ''}
            leadDays={invite.lead_days != null ? String(invite.lead_days) : ''}
            validUntil={invite.valid_until ?? ''}
            notes={invite.notes ?? ''}
          />
          {invite.status !== 'quoted' && (
            <details className="panel" style={{ marginTop: 16 }}>
              <summary><b>We cannot quote for this one</b></summary>
              <form method="post" action={`/api/quote/${encodeURIComponent(token)}`} className="qt-form" style={{ marginTop: 10 }}>
                <input type="hidden" name="action" value="decline" />
                <label>Reason (optional, the buyer will see it)
                  <input name="decline_reason" maxLength={300} placeholder="e.g. we do not deliver to that area" />
                </label>
                <div><button className="qt-btn" type="submit">Tell the buyer we cannot quote</button></div>
              </form>
            </details>
          )}
        </>
      )}

      {!open && invite.status === 'quoted' && (
        <div className="panel"><p>The deadline has passed. You quoted {gbp(goodsTotal(lines, prices).total)} plus {gbp(invite.delivery_charge)} delivery. The buyer is deciding now.</p></div>
      )}
      {!open && invite.status === 'invited' && <div className="panel"><p>The deadline for this request has passed.</p></div>}

      {!open && (
        <div className="qt-box" style={{ marginTop: 16 }}>
          <h2>The list</h2>
          {lines.map((l, i) => (
            <p key={l.id} style={{ margin: '4px 0' }}>{i + 1}. {qtyText(l.qty)} {l.unit === 'each' ? '×' : l.unit} {l.item}{detail(l) ? `, ${detail(l)}` : ''}</p>
          ))}
        </div>
      )}

      <p className="small muted" style={{ marginTop: 24 }}>
        The Little Green Book passes price requests from checked landscaping firms to suppliers. The order itself is between you and the buyer.{' '}
        <Link href="/legal/terms">Terms</Link> · <Link href="/legal/privacy">Privacy</Link>
      </p>
    </div>
  );
}
