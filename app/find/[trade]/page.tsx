import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { publicListings, knownTrade, tradePlural, tradePluralCap, areaName } from '@/lib/seo';
import { tradeLabel } from '@/lib/config';

export const revalidate = 3600;

async function load(trade: string) {
  if (!knownTrade(trade)) return null;
  const list = (await publicListings()).filter((l) => l.trades.includes(trade));
  return list.length ? list : null;
}

export async function generateMetadata({ params }: { params: Promise<{ trade: string }> }): Promise<Metadata> {
  const { trade } = await params;
  const list = await load(trade);
  if (!list) return { title: 'Not found | The Little Green Book', robots: { index: false } };
  const plural = tradePlural(trade);
  return {
    title: `${tradePluralCap(trade)} by area | The Little Green Book`,
    description: `Find ${plural} across the UK by area. ${list.filter((l) => l.verified).length} verified member${list.filter((l) => l.verified).length === 1 ? '' : 's'}, each with insurance and accreditations shown on their profile.`,
    alternates: { canonical: `/find/${trade}` },
  };
}

export default async function TradePage({ params }: { params: Promise<{ trade: string }> }) {
  const { trade } = await params;
  const list = await load(trade);
  if (!list) notFound();
  const areas = new Map<string, number>();
  for (const l of list) areas.set(l.area, (areas.get(l.area) ?? 0) + 1);
  const sorted = [...areas.entries()].sort((a, b) => (areaName(a[0]) ?? '').localeCompare(areaName(b[0]) ?? ''));
  return (
    <div className="narrow">
      <p><Link href="/find">&larr; All trades</Link></p>
      <h1>{tradePluralCap(trade)} by area</h1>
      <p className="lead">Choose an area to see the {tradePlural(trade)} based there, with their insurance and accreditations.</p>
      <ul>
        {sorted.map(([code, n]) => <li key={code}><Link href={`/find/${trade}/${code.toLowerCase()}`}>{areaName(code)} ({code} postcodes)</Link> <span className="muted">({n})</span></li>)}
      </ul>
      <p>Not in the list? <Link href={`/search?trade=${trade}`}>Search by postcode and distance</Link>, since many trades cover a wide area around where they are based.</p>
    </div>
  );
}
