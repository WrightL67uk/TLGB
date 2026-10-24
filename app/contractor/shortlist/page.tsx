import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db } from '@/lib/supabase';
import { getContractor, isUuid } from '@/lib/contractors';
import { tradeWarnings, type StatusRow } from '@/lib/tradeStatus';
import { tradeLabel, gbp } from '@/lib/config';
import ContractorNav from '../ContractorNav';
import '../../contractor.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Shortlist | TLGB' };

type SP = Promise<{ list?: string; error?: string; trade?: string }>;

function Act({ action, back, fields, label, cls }: { action: string; back: string; fields: Record<string, string>; label: string; cls?: string }) {
  return (
    <form method="post" action="/api/contractor/action">
      <input type="hidden" name="action" value={action} />
      <input type="hidden" name="back" value={back} />
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button type="submit" className={cls}>{label}</button>
    </form>
  );
}

export default async function Shortlist({ searchParams }: { searchParams: SP }) {
  const me = await getContractor();
  if (!me) redirect('/login?next=/contractor/shortlist');
  const sp = await searchParams;
  const cid = me.company.id;

  const [{ data: lists }, { data: favs }] = await Promise.all([
    db().from('contractor_lists').select('id, name').eq('company_id', cid).order('name'),
    db().from('contractor_favourites').select('business_id, note, added_by, created_at').eq('company_id', cid).order('created_at', { ascending: false }),
  ]);
  const myLists = lists ?? [];
  const listIds = new Set(myLists.map((l) => l.id as string));
  const { data: items } = listIds.size
    ? await db().from('contractor_list_items').select('list_id, business_id').in('list_id', [...listIds])
    : { data: [] as { list_id: string; business_id: string }[] };
  const myItems = items ?? [];
  const current = isUuid(sp.list) && listIds.has(sp.list) ? sp.list : '';
  const back = current ? `/contractor/shortlist?list=${current}` : '/contractor/shortlist';

  let shown = favs ?? [];
  if (current) shown = shown.filter((f) => myItems.some((i) => i.list_id === current && i.business_id === f.business_id));
  const ids = shown.map((f) => f.business_id as string);
  const { data: biz } = ids.length
    ? await db().from('businesses').select('id, trading_name, trades, base_postcode, radius_miles, phone, email, pl_cover_amount, status, founding_member, subscription_status, pl_expiry, el_expiry, el_cover_amount, accreditations, accreditation_expiries').in('id', ids)
    : { data: [] as never[] };
  const byId = new Map((biz ?? []).map((b) => [b.id as string, b]));
  const trade = sp.trade ?? '';
  const rows = shown.map((f) => ({ f, b: byId.get(f.business_id) })).filter((r) => r.b && (!trade || r.b.trades.includes(trade)));
  const tradesHere = [...new Set((biz ?? []).flatMap((b) => b.trades as string[]))];

  return (
    <div className="ct-page">
      <ContractorNav me={me} on="shortlist" />
      {sp.error && <p className="err big">{sp.error}</p>}

      <div className="ct-box">
        <div className="ct-inline" style={{ justifyContent: 'space-between' }}>
          <div className="ct-actions">
            <Link href="/contractor/shortlist" className={`ct-btn${!current ? ' go' : ''}`}>All saved ({favs?.length ?? 0})</Link>
            {myLists.map((l) => (
              <Link key={l.id} href={`/contractor/shortlist?list=${l.id}`} className={`ct-btn${current === l.id ? ' go' : ''}`}>
                {l.name} ({myItems.filter((i) => i.list_id === l.id).length})
              </Link>
            ))}
          </div>
          <form method="post" action="/api/contractor/action" className="ct-inline">
            <input type="hidden" name="action" value="list-create" />
            <input type="hidden" name="back" value="/contractor/shortlist" />
            <input name="name" required maxLength={60} placeholder="New list, e.g. Soft landscaping, Kent" />
            <button type="submit" className="ct-btn">add list</button>
          </form>
        </div>
        {current && (
          <div className="ct-actions" style={{ marginTop: 10 }}>
            <Act action="list-delete" back="/contractor/shortlist" fields={{ list_id: current }} label="Delete this list (keeps the trades saved)" />
          </div>
        )}
      </div>

      {tradesHere.length > 1 && (
        <form method="get" className="ct-inline" style={{ marginBottom: 12 }}>
          {current && <input type="hidden" name="list" value={current} />}
          <select name="trade" defaultValue={trade}>
            <option value="">All trades</option>
            {tradesHere.map((t) => <option key={t} value={t}>{tradeLabel(t)}</option>)}
          </select>
          <button type="submit" className="ct-btn">filter</button>
        </form>
      )}

      {!rows.length && (
        <p className="ct-empty">
          {favs?.length ? 'Nothing in this list yet. Add trades from "All saved".' : <>Your shortlist is empty. <Link href="/search">Find trades</Link> and press &ldquo;Save to shortlist&rdquo; on any listing.</>}
        </p>
      )}

      {rows.map(({ f, b }) => {
        const inLists = myLists.filter((l) => myItems.some((i) => i.list_id === l.id && i.business_id === b!.id));
        const notIn = myLists.filter((l) => !inLists.includes(l));
        return (
          <div key={b!.id} className="ct-box">
            <div className="ct-row" style={{ paddingTop: 0 }}>
              <div className="grow">
                <h3><Link href={`/b/${b!.id}`}>{b!.trading_name}</Link></h3>
                <div className="ct-meta">
                  <span>{(b!.trades as string[]).map(tradeLabel).join(', ')}</span>
                  <span>{b!.base_postcode}, covers {b!.radius_miles} miles</span>
                  <span>Public liability {gbp(b!.pl_cover_amount)}</span>
                </div>
                <div className="ct-meta"><a href={`tel:${b!.phone}`}>{b!.phone}</a><a href={`mailto:${b!.email}`}>{b!.email}</a></div>
                <div style={{ marginTop: 6 }}>{tradeWarnings(b as StatusRow).map((w) => <span key={w.text} className={`ct-tag ${w.tone}`}>{w.text}</span>)}</div>
              </div>
              <div className="ct-actions">
                <Act action="fav-remove" back={back} fields={{ business_id: b!.id }} label="Remove" />
              </div>
            </div>
            <div className="ct-actions" style={{ marginBottom: 8 }}>
              {inLists.map((l) => (
                <Act key={l.id} action="list-remove" back={back} fields={{ list_id: l.id, business_id: b!.id }} label={`${l.name} ✕`} />
              ))}
              {notIn.length > 0 && (
                <form method="post" action="/api/contractor/action" className="ct-inline">
                  <input type="hidden" name="action" value="list-add" />
                  <input type="hidden" name="back" value={back} />
                  <input type="hidden" name="business_id" value={b!.id} />
                  <select name="list_id" defaultValue="">
                    <option value="" disabled>Add to a list</option>
                    {notIn.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                  <button type="submit">add</button>
                </form>
              )}
            </div>
            <form method="post" action="/api/contractor/action">
              <input type="hidden" name="action" value="fav-note" />
              <input type="hidden" name="back" value={back} />
              <input type="hidden" name="business_id" value={b!.id} />
              <textarea name="note" className="ct-note" maxLength={2000} defaultValue={f.note ?? ''} placeholder="Private notes your team can see, e.g. good on the Linton job, slow with paperwork" />
              <div className="ct-actions" style={{ marginTop: 6 }}>
                <button type="submit">save note</button>
                <span className="muted small">Saved by {f.added_by ?? 'your team'}</span>
              </div>
            </form>
          </div>
        );
      })}
    </div>
  );
}
