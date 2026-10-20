import Link from 'next/link';
import { db, photoUrl } from '@/lib/supabase';
import { lookupPostcode } from '@/lib/postcodes';
import { ACCREDITATIONS, accreditationLabel, accreditationsForTrade, gbp, tradeLabel } from '@/lib/config';
import SearchForm from './SearchForm';

export const dynamic = 'force-dynamic';

type Result = {
  id: string; trading_name: string; business_type: string; trades: string[];
  accreditations: string[]; pl_cover_amount: number | null; base_postcode: string;
  distance_miles: number; description: string | null;
};

type SP = Promise<Record<string, string | string[] | undefined>>;

export const metadata = { title: 'Search trades | TLGB' };

export default async function Search({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const postcode = typeof sp.postcode === 'string' ? sp.postcode : '';
  const trade = typeof sp.trade === 'string' ? sp.trade : '';
  const minPl = typeof sp.pl === 'string' ? sp.pl : '';
  const accreds = ([] as string[]).concat(sp.accred ?? []).filter((a) => (ACCREDITATIONS as readonly string[]).includes(a));

  // Link that drops one filter but keeps the rest of the search
  const withoutParam = (key: string, value: string) => {
    const q = new URLSearchParams();
    if (postcode) q.set('postcode', postcode);
    if (trade) q.set('trade', trade);
    if (minPl && !(key === 'pl' && value === minPl)) q.set('pl', minPl);
    for (const a of accreds) if (!(key === 'accred' && a === value)) q.append('accred', a);
    return `/search?${q.toString()}`;
  };
  // On result cards, show the filters asked for first, then that trade's own qualifications
  const tradeKeys = trade ? accreditationsForTrade(trade).map((a) => a.key) : [];
  const rank = (a: string) => (accreds.includes(a) ? 0 : tradeKeys.includes(a) ? 1 : 2);
  const badgeOrder = (list: string[]) => [...list].sort((x, y) => rank(x) - rank(y));

  let results: Result[] | null = null;
  let thumbs = new Map<string, string>();
  let searchError: string | null = null;

  if (postcode) {
    const pc = await lookupPostcode(postcode);
    if (!pc.ok) searchError = pc.reason;
    else {
      const { data, error } = await db().rpc('search_businesses', {
        job_lat: pc.lat,
        job_lng: pc.lng,
        trade_slug: trade || null,
        required_accreds: accreds,
        min_pl_cover: minPl ? Number(minPl) : null,
      });
      if (error) {
        console.error(error);
        searchError = 'Search failed. Please try again.';
      } else {
        results = data as Result[];
        if (results.length) {
          const { data: photos } = await db()
            .from('business_photos')
            .select('business_id, storage_path, sort_order')
            .in('business_id', results.map((r) => r.id))
            .order('sort_order');
          for (const p of photos ?? []) if (!thumbs.has(p.business_id)) thumbs.set(p.business_id, photoUrl(p.storage_path));
        }
      }
    }
  }

  return (
    <div>
      <section className="hero">
        <h1>Find vetted trades for your job</h1>
        <p className="lead">Landscapers, arborists, groundworkers and more. Insurance and accreditations checked before they are listed.</p>

        <SearchForm postcode={postcode} trade={trade} minPl={minPl} accreds={accreds} />
      </section>

      {searchError && <p className="err big">{searchError}</p>}

      {results && (
        <section>
          <h2>{results.length} {results.length === 1 ? 'business covers' : 'businesses cover'} {postcode.toUpperCase()}{trade ? ` for ${tradeLabel(trade)}` : ''}</h2>
          {(accreds.length > 0 || minPl) && (
            <p className="active-filters">
              <span className="muted small">Must have:</span>
              {minPl && <a className="chip-on" href={withoutParam('pl', minPl)}>PL {gbp(Number(minPl))} or more <span aria-hidden>×</span></a>}
              {accreds.map((a) => (
                <a key={a} className="chip-on" href={withoutParam('accred', a)} title="Remove this filter">{accreditationLabel(a)} <span aria-hidden>×</span></a>
              ))}
            </p>
          )}
          {results.length === 0 && <p className="muted">Nobody matches yet. Try removing a filter.</p>}
          <div className="results">
            {results.map((r) => (
              <Link href={`/b/${r.id}`} key={r.id} className="card">
                {thumbs.get(r.id) ? <img src={thumbs.get(r.id)} alt="" /> : <div className="noimg" />}
                <div className="card-body">
                  <h3>{r.trading_name}</h3>
                  <p className="muted">{r.trades.map(tradeLabel).join(', ')}</p>
                  <p className="badges">
                    <span className="badge ok">{r.business_type === 'ltd' ? 'Companies House checked' : 'Sole trader, checked'}</span>
                    <span className="badge">PL {gbp(r.pl_cover_amount)}</span>
                    {badgeOrder(r.accreditations).slice(0, 4).map((a) => <span className="badge" key={a}>{accreditationLabel(a)}</span>)}
                    {r.accreditations.length > 4 && <span className="badge">+{r.accreditations.length - 4} more</span>}
                  </p>
                  <p className="muted small">{r.base_postcode}, {r.distance_miles.toFixed(0)} miles away</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
