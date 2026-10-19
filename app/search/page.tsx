import Link from 'next/link';
import { db, photoUrl } from '@/lib/supabase';
import { lookupPostcode } from '@/lib/postcodes';
import { ACCREDITATIONS, TRADES, PL_COVER_OPTIONS, gbp, tradeLabel } from '@/lib/config';

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

        <form className="search" method="get">
          <label>Job postcode<input name="postcode" defaultValue={postcode} required placeholder="e.g. EN8 8YD" /></label>
          <label>Trade
            <select name="trade" defaultValue={trade}>
              <option value="">Any trade</option>
              {TRADES.map((t) => <option key={t.slug} value={t.slug}>{t.label}</option>)}
            </select>
          </label>
          <label>Min. public liability
            <select name="pl" defaultValue={minPl}>
              <option value="">Any</option>
              {PL_COVER_OPTIONS.map((n) => <option key={n} value={n}>{gbp(n)}</option>)}
            </select>
          </label>
          <details className="accreds">
            <summary>Required accreditations{accreds.length ? ` (${accreds.length})` : ''}</summary>
            <div className="checks">
              {ACCREDITATIONS.map((a) => (
                <label key={a} className="check">
                  <input type="checkbox" name="accred" value={a} defaultChecked={accreds.includes(a)} /> {a}
                </label>
              ))}
            </div>
          </details>
          <button type="submit" className="primary">Search</button>
        </form>
      </section>

      {searchError && <p className="err big">{searchError}</p>}

      {results && (
        <section>
          <h2>{results.length} {results.length === 1 ? 'business covers' : 'businesses cover'} {postcode.toUpperCase()}</h2>
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
                    {r.accreditations.slice(0, 3).map((a) => <span className="badge" key={a}>{a}</span>)}
                    {r.accreditations.length > 3 && <span className="badge">+{r.accreditations.length - 3}</span>}
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
