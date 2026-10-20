import Link from 'next/link';
import { db } from '@/lib/supabase';
import { getSessionEmail } from '@/lib/session';
import { TRADES, tradeLabel } from '@/lib/config';
import { SOURCE_LABEL, type LeadSource } from '@/lib/leads';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Leads | The Little Green Book',
  description: 'Live landscaping, grounds maintenance, tree work and external works tenders from across the UK, gathered every morning.',
};

type Lead = {
  id: string; source: LeadSource; title: string; description: string | null; buyer: string | null;
  region: string | null; postcode: string | null; lat: number | null; lng: number | null;
  value_amount: number | null; currency: string | null; published_at: string | null;
  deadline: string | null; url: string | null; trades: string[];
};

type SP = Promise<Record<string, string | string[] | undefined>>;

const REGIONS = ['London', 'South East', 'East of England', 'South West', 'West Midlands', 'East Midlands',
  'Yorkshire and The Humber', 'North West', 'North East', 'Wales', 'Scotland', 'Northern Ireland'];

const ukDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const money = (n: number | null, c: string | null) =>
  n == null ? null : `${c && c !== 'GBP' ? `${c} ` : '£'}${n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}m` : n >= 1000 ? `${Math.round(n / 1000)}k` : n}`;
const daysLeft = (d: string) => Math.ceil((Date.parse(d) - Date.now()) / 86_400_000);

function miles(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(r(bLat - aLat) / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLng - aLng) / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

export default async function LeadsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const email = await getSessionEmail();
  const loggedIn = !!email;

  // A logged-in trade sees leads matched to their listing by default
  const { data: mine } = loggedIn
    ? await db().from('businesses').select('trades, lat, lng, radius_miles').eq('email', email).neq('status', 'draft')
    : { data: null };
  const myTrades = [...new Set((mine ?? []).flatMap((b) => b.trades as string[]))];

  const view = typeof sp.view === 'string' ? sp.view : loggedIn && myTrades.length ? 'mine' : 'all';
  const trade = typeof sp.trade === 'string' && TRADES.some((t) => t.slug === sp.trade) ? sp.trade : '';
  const region = typeof sp.region === 'string' && REGIONS.includes(sp.region) ? sp.region : '';

  let q = db()
    .from('leads')
    .select('id, source, title, description, buyer, region, postcode, lat, lng, value_amount, currency, published_at, deadline, url, trades')
    .or(`deadline.is.null,deadline.gte.${new Date().toISOString()}`)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(400);
  if (trade) q = q.contains('trades', [trade]);
  else if (view === 'mine' && myTrades.length) q = q.overlaps('trades', myTrades);
  if (region) q = q.eq('region', region);
  const { data } = await q;
  let leads = (data ?? []) as Lead[];

  // "Matched to me": also within the miles the trade travels, when we know where the buyer is
  if (view === 'mine' && mine?.length && !region) {
    leads = leads.filter((l) =>
      l.lat == null || l.lng == null ||
      mine.some((b) => b.lat != null && miles(b.lat, b.lng, l.lat!, l.lng!) <= (b.radius_miles ?? 30) + 10));
  }

  const { count: totalOpen } = await db()
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .or(`deadline.is.null,deadline.gte.${new Date().toISOString()}`);

  const visible = loggedIn ? leads : leads.slice(0, 1);
  const locked = loggedIn ? [] : leads.slice(1, 13);

  const link = (over: Record<string, string>) => {
    const p = new URLSearchParams();
    const next = { view, trade, region, ...over };
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    return `/leads?${p.toString()}`;
  };

  return (
    <div className="leads-page">
      <section className="leads-head">
        <h1>Leads</h1>
        <p className="lead">
          Live landscaping and external works tenders from councils, schools, housing associations and other public buyers,
          gathered from the government&rsquo;s free tender feeds every morning.
        </p>
        <p className="muted small">{totalOpen ?? 0} open leads right now. Sources: Find a Tender, Contracts Finder, Public Contracts Scotland and Sell2Wales.</p>
      </section>

      <form className="leads-filters" method="get" action="/leads">
        {loggedIn && myTrades.length > 0 && (
          <div className="seg">
            <Link href={link({ view: 'mine', trade: '' })} className={view === 'mine' && !trade ? 'on' : ''}>matched to me</Link>
            <Link href={link({ view: 'all' })} className={view === 'all' || trade ? 'on' : ''}>all leads</Link>
          </div>
        )}
        <input type="hidden" name="view" value="all" />
        <label>Trade
          <select name="trade" defaultValue={trade}>
            <option value="">All trades</option>
            {TRADES.map((t) => <option key={t.slug} value={t.slug}>{t.label}</option>)}
          </select>
        </label>
        <label>Region
          <select name="region" defaultValue={region}>
            <option value="">Anywhere</option>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <button type="submit" className="sq sq-rust">show leads</button>
      </form>

      {leads.length === 0 && <p className="muted">No open leads match right now. New ones arrive every morning.</p>}

      <div className="lead-list">
        {visible.map((l) => (
          <article key={l.id} className="lead-card">
            <div className="lead-tags">
              {l.trades.map((t) => <span key={t} className="badge ok">{tradeLabel(t)}</span>)}
              {l.region && <span className="badge">{l.region}</span>}
            </div>
            <h2>{l.title}</h2>
            <p className="lead-meta">
              {l.buyer && <strong>{l.buyer}</strong>}
              {money(l.value_amount, l.currency) && <span>Value {money(l.value_amount, l.currency)}</span>}
              {l.published_at && <span>Published {ukDate(l.published_at)}</span>}
              {l.deadline && (
                <span className={daysLeft(l.deadline) <= 7 ? 'due-soon' : ''}>
                  Closes {ukDate(l.deadline)} ({daysLeft(l.deadline)} day{daysLeft(l.deadline) === 1 ? '' : 's'})
                </span>
              )}
            </p>
            {l.description && <p className="lead-desc">{l.description.length > 420 ? `${l.description.slice(0, 420)}...` : l.description}</p>}
            <p className="lead-foot">
              {l.url && <a href={l.url} target="_blank" rel="noopener" className="sq sq-rust">view the tender</a>}
              <span className="muted small">via {SOURCE_LABEL[l.source]}</span>
            </p>
          </article>
        ))}

        {!loggedIn && leads.length > 1 && (
          <>
            <div className="lead-gate">
              <h2>{leads.length - 1} more {leads.length - 1 === 1 ? 'lead' : 'leads'} {trade || region ? 'match this search' : 'open now'}</h2>
              <p>Every listed business gets the full leads feed, matched to their trades and the area they cover.</p>
              <div className="gate-btns">
                <Link href="/join" className="sq sq-rust">list your business</Link>
                <Link href="/login?next=/leads" className="sq sq-ghost">log in</Link>
              </div>
            </div>
            {locked.map((l) => (
              <article key={l.id} className="lead-card lead-locked" aria-hidden>
                <div className="lead-tags">
                  {l.trades.map((t) => <span key={t} className="badge ok">{tradeLabel(t)}</span>)}
                  {l.region && <span className="badge">{l.region}</span>}
                </div>
                <div className="lock-bar" />
                <div className="lock-bar short" />
                <p className="lead-meta">
                  {money(l.value_amount, l.currency) && <span>Value {money(l.value_amount, l.currency)}</span>}
                  {l.deadline && <span>Closes {ukDate(l.deadline)}</span>}
                </p>
              </article>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
