import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/supabase';
import { ownedBusiness } from '@/lib/account';
import { isPaid } from '@/lib/membership';
import {
  cleanLine, cleanPrice, cleanInvite, goodsTotal, isOpen, gbp, qtyText, statusText, matchSuppliers, MAX_SUPPLIERS,
  type QRequest,
} from '@/lib/quotes';
import { rootLabel, quoteCategoryLabel } from '@/lib/quoteTypes';
import { shortUrl } from '@/lib/resources';
import '../../../../quotes.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Price request | TLGB' };

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { timeZone: 'Europe/London', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const day = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const STATUS: Record<string, string> = { invited: 'Not priced yet', quoted: 'Priced', declined: 'Cannot quote', won: 'Accepted', lost: 'Not chosen' };

type SP = Promise<{ sent?: string; accepted?: string; cancelled?: string; rated?: string; more?: string; error?: string }>;

export default async function QuoteRequest({ params, searchParams }: { params: Promise<{ id: string; rid: string }>; searchParams: SP }) {
  const { id, rid } = await params;
  const sp = await searchParams;
  const own = await ownedBusiness(id);
  if (!own.ok) {
    if (own.status === 401) redirect(`/login?next=/account/${id}/quotes/${rid}`);
    notFound();
  }
  const b = own.business;
  if (!/^[0-9a-f-]{36}$/i.test(rid)) notFound();
  const { data: r } = await db().from('quote_requests').select('*').eq('id', rid).eq('business_id', b.id).maybeSingle();
  if (!r) notFound();
  const request = r as QRequest;

  const [{ data: lineRows }, { data: invRows }, { data: rating }] = await Promise.all([
    db().from('quote_lines').select('*').eq('request_id', rid).order('position'),
    db().from('quote_invites').select('id, request_id, supplier_id, status, viewed_at, quoted_at, goods_total, delivery_charge, lead_days, valid_until, notes, decline_reason').eq('request_id', rid),
    db().from('supplier_ratings').select('stars, comment').eq('request_id', rid).maybeSingle(),
  ]);
  const lines = (lineRows ?? []).map(cleanLine);
  const invites = (invRows ?? []).map(cleanInvite);
  const [{ data: priceRows }, { data: sups }] = await Promise.all([
    invites.length ? db().from('quote_prices').select('*').in('invite_id', invites.map((i) => i.id)) : Promise.resolve({ data: [] }),
    invites.length ? db().from('suppliers').select('id, name, town, email, phone, website').in('id', invites.map((i) => i.supplier_id)) : Promise.resolve({ data: [] }),
  ]);
  const prices = (priceRows ?? []).map(cleanPrice);
  const sup = (sid: string) => (sups ?? []).find((s) => s.id === sid);

  const open = isOpen(request);
  const finished = request.status === 'accepted' || request.status === 'cancelled';
  const st = statusText(request);
  const quoted = invites
    .filter((i) => ['quoted', 'won', 'lost'].includes(i.status))
    .map((i) => {
      const mine = prices.filter((p) => p.invite_id === i.id);
      const g = goodsTotal(lines, mine);
      return { i, mine, g, total: g.total + (i.delivery_charge ?? 0) };
    })
    .sort((a, b) => a.g.missing - b.g.missing || a.total - b.total);
  const lowest = quoted.filter((q) => q.g.missing === 0).sort((a, b) => a.total - b.total)[0]?.i.id;

  // Cheapest line total for each line, for highlighting and the "split the order" figure
  const bestFor = new Map<string, number>();
  for (const l of lines) {
    const vals = quoted.map((q) => q.mine.find((p) => p.line_id === l.id)).filter((p) => p && p.available !== 'no' && p.unit_price != null).map((p) => p!.unit_price! * l.qty);
    if (vals.length) bestFor.set(l.id, Math.min(...vals));
  }
  const splitGoods = Array.from(bestFor.values()).reduce((a, b) => a + b, 0);
  const splitFrom = new Set(lines.map((l) => quoted.find((q) => { const p = q.mine.find((x) => x.line_id === l.id); return p && p.unit_price != null && p.available !== 'no' && Math.abs(p.unit_price * l.qty - (bestFor.get(l.id) ?? -1)) < 0.005; })?.i.id).filter(Boolean));

  const winner = request.accepted_invite ? invites.find((i) => i.id === request.accepted_invite) : null;
  const winSup = winner ? sup(winner.supplier_id) : null;

  let more: { id: string; name: string; town: string | null }[] = [];
  if (!finished && isPaid(b) && invites.length < MAX_SUPPLIERS + 4 && r.lat != null) {
    const matches = await matchSuppliers(Array.from(new Set(lines.map((l) => l.category))), Number(r.lat), Number(r.lng));
    more = matches.filter((m) => !invites.some((i) => i.supplier_id === m.id)).slice(0, 8);
  }
  const detail = (l: (typeof lines)[number]) => [l.spec, rootLabel(l.root), l.category !== 'trees-plants' ? quoteCategoryLabel(l.category) : ''].filter(Boolean).join(', ');
  const hidden = (action: string) => (
    <>
      <input type="hidden" name="business_id" value={b.id} />
      <input type="hidden" name="request_id" value={rid} />
      <input type="hidden" name="action" value={action} />
    </>
  );

  return (
    <div className="qt">
      <p className="small"><Link href={`/account/${b.id}/quotes`}>Back to price requests</Link></p>
      <h1>{request.reference} <span className={`qt-status ${st.cls}`}>{st.label}</span></h1>
      <div className="qt-meta" style={{ marginBottom: 16 }}>
        <span>Deliver to <b>{request.postcode}</b></span>
        {request.needed_by && <span>Needed by <b>{day(request.needed_by)}</b></span>}
        <span>Prices wanted by <b>{when(request.closes_at)}</b></span>
        <span><b>{quoted.length}</b> of {invites.length} priced</span>
      </div>

      {sp.sent && <p className="ok-box">Sent. Suppliers have your list now. We will email you each time one sends prices, and again at the deadline.</p>}
      {sp.accepted && <p className="ok-box">Accepted. We have sent the supplier your contact details so they can confirm the order with you, and told the others.</p>}
      {sp.cancelled && <p className="ok-box">Request closed.</p>}
      {sp.rated && <p className="ok-box">Thanks for rating. It helps other members choose.</p>}
      {sp.more && <p className="ok-box">Sent to {sp.more} more supplier{sp.more === '1' ? '' : 's'}.</p>}
      {sp.error && <p className="err big">{sp.error}</p>}

      {winner && winSup && (
        <div className="qt-box" style={{ borderLeft: '4px solid var(--forest)', marginBottom: 16 }}>
          <h2>You accepted {winSup.name}</h2>
          <p style={{ margin: '0 0 6px' }}>They have your details and should be in touch to confirm the order, delivery and payment. To contact them:</p>
          <p style={{ margin: 0 }}>
            {winSup.email && <><a href={`mailto:${winSup.email}`}>{winSup.email}</a><br /></>}
            {winSup.phone && <><a href={`tel:${winSup.phone.replace(/\s/g, '')}`}>{winSup.phone}</a><br /></>}
            {winSup.website && <a href={winSup.website} target="_blank" rel="noopener">{shortUrl(winSup.website)}</a>}
          </p>
          <form method="post" action="/api/quotes/action" className="qt-form" style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
            {hidden('rate')}
            <b>{rating ? `You rated them ${rating.stars} star${rating.stars === 1 ? '' : 's'}. Change your rating:` : 'Once the delivery has arrived, rate them for other members:'}</b>
            <div className="rate-stars">
              {[5, 4, 3, 2, 1].map((n) => (
                <span key={n} style={{ display: 'contents' }}>
                  <input type="radio" name="stars" value={n} id={`s${n}`} defaultChecked={rating?.stars === n} required />
                  <label htmlFor={`s${n}`} title={`${n} star${n === 1 ? '' : 's'}`}>★</label>
                </span>
              ))}
            </div>
            <label>Comment (optional, shown on their listing)
              <textarea name="comment" maxLength={600} defaultValue={rating?.comment ?? ''} placeholder="Price, quality of stock, delivery on time, how they handled problems" />
            </label>
            <div><button className="qt-btn" type="submit">Save rating</button></div>
          </form>
        </div>
      )}

      {quoted.length > 0 ? (
        <>
          <h2>Compare prices</h2>
          <p className="hint" style={{ marginTop: -6 }}>Line totals excluding VAT. Green is the cheapest for that line.{open ? ' Suppliers can still change their prices until the deadline.' : ''}</p>
          <div className="qt-compare-wrap">
            <table className="qt-compare">
              <thead>
                <tr>
                  <th>Item</th>
                  {quoted.map((q) => <th key={q.i.id} className={q.i.status === 'won' ? 'won' : ''}>{sup(q.i.supplier_id)?.name ?? 'Supplier'}{q.i.id === lowest && quoted.length > 1 ? <><br /><span className="small">lowest full price</span></> : null}</th>)}
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id}>
                    <td><b>{qtyText(l.qty)} {l.unit === 'each' ? '×' : l.unit}</b> {l.item}{detail(l) && <span className="small muted"><br />{detail(l)}</span>}{l.notes && <span className="small muted"><br />{l.notes}</span>}</td>
                    {quoted.map((q) => {
                      const p = q.mine.find((x) => x.line_id === l.id);
                      if (!p || p.available === 'no' || p.unit_price == null) return <td key={q.i.id} className="none">not available</td>;
                      const t = p.unit_price * l.qty;
                      const best = quoted.length > 1 && Math.abs(t - (bestFor.get(l.id) ?? -1)) < 0.005;
                      return (
                        <td key={q.i.id} className={best ? 'best' : ''}>
                          {gbp(t)}<span className="note">{gbp(p.unit_price)} each{l.unit !== 'each' ? ` ${l.unit}` : ''}</span>
                          {p.available === 'sub' && <span className="sub">Alternative: {p.substitute}</span>}
                          {p.note && <span className="note">{p.note}</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td>Goods</td>{quoted.map((q) => <td key={q.i.id}>{gbp(q.g.total)}</td>)}</tr>
                <tr><td>Delivery</td>{quoted.map((q) => <td key={q.i.id}>{q.i.delivery_charge ? gbp(q.i.delivery_charge) : 'Free'}</td>)}</tr>
                <tr className="total"><td>Total excluding VAT</td>{quoted.map((q) => <td key={q.i.id}>{gbp(q.total)}</td>)}</tr>
                <tr><td>Items missing</td>{quoted.map((q) => <td key={q.i.id} style={{ color: q.g.missing ? 'var(--danger)' : undefined }}>{q.g.missing ? q.g.missing : 'none'}{q.g.subs ? <span className="sub">{q.g.subs} alternative{q.g.subs === 1 ? '' : 's'}</span> : null}</td>)}</tr>
                <tr><td>Lead time</td>{quoted.map((q) => <td key={q.i.id}>{q.i.lead_days != null ? `${q.i.lead_days} working day${q.i.lead_days === 1 ? '' : 's'}` : ''}</td>)}</tr>
                <tr><td>Prices valid until</td>{quoted.map((q) => <td key={q.i.id}>{q.i.valid_until ? day(q.i.valid_until) : ''}</td>)}</tr>
                <tr><td>Supplier notes</td>{quoted.map((q) => <td key={q.i.id} style={{ whiteSpace: 'normal', maxWidth: 220, fontWeight: 400 }}>{q.i.notes}</td>)}</tr>
                {!finished && (
                  <tr>
                    <td />
                    {quoted.map((q) => (
                      <td key={q.i.id}>
                        <form method="post" action="/api/quotes/action">
                          {hidden('accept')}
                          <input type="hidden" name="invite_id" value={q.i.id} />
                          <button type="submit" className="qt-btn go small">Accept</button>
                        </form>
                      </td>
                    ))}
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
          {quoted.length > 1 && splitFrom.size > 1 && (
            <p className="hint">Buying each item from whoever is cheapest would cost {gbp(splitGoods)} for goods, from {splitFrom.size} suppliers, plus each one&apos;s delivery charge. To split an order, contact the suppliers directly.</p>
          )}
        </>
      ) : (
        <div className="qt-box">
          <h2>Your list</h2>
          {lines.map((l, i) => <p key={l.id} style={{ margin: '4px 0' }}>{i + 1}. {qtyText(l.qty)} {l.unit === 'each' ? '×' : l.unit} {l.item}{detail(l) ? `, ${detail(l)}` : ''}</p>)}
          <p className="hint" style={{ marginTop: 10 }}>{open ? 'No prices back yet. We will email you as each one arrives.' : 'No supplier sent prices before the deadline. Try sending it to more suppliers below.'}</p>
        </div>
      )}

      <h2 style={{ marginTop: 24 }}>Suppliers asked</h2>
      <table className="table">
        <tbody>
          {invites.map((i) => (
            <tr key={i.id}>
              <td><b>{sup(i.supplier_id)?.name}</b>{sup(i.supplier_id)?.town ? `, ${sup(i.supplier_id)?.town}` : ''}</td>
              <td>{STATUS[i.status] ?? i.status}{i.status === 'invited' && i.viewed_at ? ' (has looked at it)' : ''}{i.status === 'declined' && i.decline_reason ? `: ${i.decline_reason}` : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {more.length > 0 && (
        <form method="post" action="/api/quotes/action" className="qt-box" style={{ marginTop: 16 }}>
          {hidden('more')}
          <h2>Send to more suppliers</h2>
          <div className="qt-sups">
            {more.map((m) => (
              <label key={m.id} className="qt-sup"><input type="checkbox" name="supplier" value={m.id} /><span><b>{m.name}</b>{m.town ? `, ${m.town}` : ''}</span></label>
            ))}
          </div>
          {!open && <p className="hint">The deadline has passed, so the new suppliers get two days to reply.</p>}
          <div style={{ marginTop: 10 }}><button className="qt-btn" type="submit">Send to ticked suppliers</button></div>
        </form>
      )}

      {!finished && (
        <form method="post" action="/api/quotes/action" style={{ marginTop: 24 }}>
          {hidden('cancel')}
          <button className="qt-btn small" type="submit">Close this request without accepting</button>
          <span className="hint"> Suppliers will no longer be able to price it.</span>
        </form>
      )}
    </div>
  );
}
