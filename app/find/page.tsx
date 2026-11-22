import Link from 'next/link';
import type { Metadata } from 'next';
import { publicListings, tradePlural } from '@/lib/seo';
import { tradeLabel } from '@/lib/config';

export const revalidate = 3600;
export const metadata: Metadata = {
  title: 'Find landscape trades by trade and area | The Little Green Book',
  description: 'Browse landscapers, groundworkers, tree surgeons and other external works trades by area. Each listing shows whether insurance and accreditations have been checked.',
  alternates: { canonical: '/find' },
};

export default async function FindIndex() {
  const all = await publicListings();
  const by = new Map<string, number>();
  for (const l of all) for (const t of new Set(l.trades)) by.set(t, (by.get(t) ?? 0) + 1);
  const trades = [...by.entries()].sort((a, b) => tradeLabel(a[0]).localeCompare(tradeLabel(b[0])));
  return (
    <div className="narrow">
      <h1>Find landscape trades by trade and area</h1>
      <p className="lead">The Little Green Book lists landscape and external works trades across the UK. Verified members have had their company details, public liability and employers liability insurance and accreditations checked by us, and each listing says clearly if that is not the case.</p>
      {trades.length === 0 && <p className="muted">No listings yet.</p>}
      <ul>
        {trades.map(([slug, n]) => <li key={slug}><Link href={`/find/${slug}`}>{tradeLabel(slug)}</Link> <span className="muted">({n})</span></li>)}
      </ul>
      <p>Prefer to search by postcode and distance? <Link href="/search">Use the search</Link>.</p>
      <p className="muted small">Trades listed: {trades.map(([s]) => tradePlural(s)).join(', ')}.</p>
    </div>
  );
}
