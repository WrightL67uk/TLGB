import Link from 'next/link';
import '../resources.css';
import { db } from '@/lib/supabase';
import { getMembership } from '@/lib/membership';
import { lookupPostcode } from '@/lib/postcodes';
import { TRADES, tradeLabel } from '@/lib/config';
import { HELP_KINDS, helpKindLabel, miles } from '@/lib/resources';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Help board | The Little Green Book',
  description: 'Landscaping and external works trades asking each other for a hand: extra labour, subcontract packages, machines and cover.',
};

type Req = {
  id: string; created_at: string; email: string; business_name: string | null; kind: string; title: string; details: string;
  trades: string[]; town: string | null; postcode: string | null; lat: number | null; lng: number | null;
  needed_from: string | null; needed_until: string | null;
};
type SP = Promise<{ kind?: string; trade?: string; postcode?: string; posted?: string; closed?: string }>;
const ukDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export default async function HelpBoardPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const m = await getMembership();
  const email = m.paid ? m.email : null; // contact details and posting are for paying members
  const kind = HELP_KINDS.some((k) => k.key === sp.kind) ? sp.kind! : '';
  const trade = TRADES.some((t) => t.slug === sp.trade) ? sp.trade! : '';
  const pcIn = (sp.postcode ?? '').trim().slice(0, 10);
  const where = pcIn ? await lookupPostcode(pcIn) : null;

  let q = db()
    .from('help_requests')
    .select('id, created_at, email, business_name, kind, title, details, trades, town, postcode, lat, lng, needed_from, needed_until')
    .eq('status', 'open')
    .gte('created_at', new Date(Date.now() - 60 * 86_400_000).toISOString())
    .order('created_at', { ascending: false })
    .limit(300);
  if (kind) q = q.eq('kind', kind);
  if (trade) q = q.contains('trades', [trade]);
  const { data } = await q;
  let rows = ((data ?? []) as Req[]).map((r) => ({
    ...r,
    dist: where?.ok && r.lat != null && r.lng != null ? miles(where.lat, where.lng, r.lat, r.lng) : null,
  }));
  if (where?.ok) rows = rows.sort((a, b) => (a.dist ?? 9999) - (b.dist ?? 9999));

  return (
    <div>
      <h1>Help board</h1>
      <p className="lead">
        Short of hands, need a package subcontracted, a machine with an operator or someone to finish a job? Ask the other
        trades on The Little Green Book. Got spare capacity? This is where to find it.
      </p>
      {sp.posted && <p className="ok-box">Your request is live. Trades who can help will contact you directly.</p>}
      {sp.closed && <p className="ok-box">Request closed.</p>}

      <div style={{ margin: '0 0 16px' }}>
        {email
          ? <Link href="/help-board/new" className="sq sq-rust">ask for help</Link>
          : m.loggedIn
            ? <span className="muted">Posting and contact details are for paying members. <Link href={m.unpaidId ? `/account/${m.unpaidId}` : '/account'}>Start your membership</Link>.</span>
            : <span className="muted">To post a request, <Link href="/login?next=/help-board">log in</Link> or <Link href="/join">list your business</Link>.</span>}
      </div>

      <form className="res-filters" method="get" action="/help-board">
        <label>Type of help
          <select name="kind" defaultValue={kind}>
            <option value="">Any</option>
            {HELP_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
          </select>
        </label>
        <label>Trade
          <select name="trade" defaultValue={trade}>
            <option value="">Any trade</option>
            {TRADES.map((t) => <option key={t.slug} value={t.slug}>{t.label}</option>)}
          </select>
        </label>
        <label>Near postcode<input name="postcode" defaultValue={pcIn} placeholder="e.g. SG1 2AB" /></label>
        <button type="submit" className="sq sq-rust">search</button>
        {(kind || trade || pcIn) && <Link href="/help-board">clear</Link>}
      </form>
      {where && !where.ok && <p className="err">{where.reason}</p>}

      {!rows.length && <p className="muted">No open requests match right now.</p>}
      <div className="res-list">
        {rows.map((r) => (
          <div key={r.id} className="res-card">
            <div className="badges">
              <span className="badge kind kind-award">{helpKindLabel(r.kind)}</span>
              {r.trades.map((t) => <span key={t} className="badge ok">{tradeLabel(t)}</span>)}
            </div>
            <h2>{r.title}</h2>
            <p style={{ whiteSpace: 'pre-line' }}>{r.details}</p>
            <p className="res-meta">
              {r.town && <span>{r.town}</span>}
              {r.dist != null && <span>{Math.round(r.dist)} miles away</span>}
              {(r.needed_from || r.needed_until) && (
                <span>Needed {r.needed_from ? `from ${ukDate(r.needed_from)}` : ''}{r.needed_until ? ` until ${ukDate(r.needed_until)}` : ''}</span>
              )}
              <span>Posted {ukDate(r.created_at)}</span>
            </p>
            {email ? (
              <p className="res-meta">
                <span>{r.business_name ?? 'A listed trade'}</span>
                <a href={`mailto:${r.email}?subject=${encodeURIComponent(`Re: ${r.title} (The Little Green Book help board)`)}`}>{r.email}</a>
                {r.email === email && (
                  <form method="post" action="/api/help-board/close" className="inline">
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit">close this request</button>
                  </form>
                )}
              </p>
            ) : (
              <p className="res-meta"><span>{m.loggedIn ? 'Members can see who posted this and get in touch.' : <><Link href="/login?next=/help-board">Log in</Link> as a member to see who posted this and get in touch.</>}</span></p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
