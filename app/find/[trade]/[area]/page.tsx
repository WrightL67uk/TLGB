import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { publicListings, knownTrade, tradePlural, tradePluralCap, areaName, areaPhrase } from '@/lib/seo';
import { accreditationLabel, gbp, tradeLabel } from '@/lib/config';
import { liveAccreditations } from '@/lib/expiries';
import { siteUrl } from '@/lib/config';

export const revalidate = 3600;

async function load(trade: string, area: string) {
  const code = area.toUpperCase();
  if (!knownTrade(trade) || !areaName(code)) return null;
  const list = (await publicListings()).filter((l) => l.area === code && l.trades.includes(trade));
  if (!list.length) return null;
  return { code, list: [...list.filter((l) => l.verified), ...list.filter((l) => !l.verified)] };
}

export async function generateMetadata({ params }: { params: Promise<{ trade: string; area: string }> }): Promise<Metadata> {
  const { trade, area } = await params;
  const d = await load(trade, area);
  if (!d) return { title: 'Not found | The Little Green Book', robots: { index: false } };
  const v = d.list.filter((l) => l.verified).length;
  return {
    title: `${tradePluralCap(trade)} in ${areaPhrase(d.code).replace(/^the /, '')} (${d.code}) | The Little Green Book`,
    description: `${d.list.length} ${d.list.length === 1 ? 'business' : 'businesses'} listed as ${tradePlural(trade)}, based in ${areaPhrase(d.code)}${v ? `, ${v} with insurance and accreditations checked by us` : ''}. See cover levels, accreditations and how to get in touch.`,
    alternates: { canonical: `/find/${trade}/${area.toLowerCase()}` },
  };
}

export default async function AreaPage({ params }: { params: Promise<{ trade: string; area: string }> }) {
  const { trade, area } = await params;
  const d = await load(trade, area);
  if (!d) notFound();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${tradePluralCap(trade)} in ${areaPhrase(d.code)}`,
    itemListElement: d.list.map((l, i) => ({ '@type': 'ListItem', position: i + 1, url: `${siteUrl()}/b/${l.id}`, name: l.trading_name })),
  };
  return (
    <div className="narrow">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <p><Link href={`/find/${trade}`}>&larr; {tradePluralCap(trade)} by area</Link></p>
      <h1>{tradePluralCap(trade)} in {areaPhrase(d.code)} ({d.code} postcodes)</h1>
      <p className="lead">{d.list.length} {d.list.length === 1 ? 'business' : 'businesses'} based in {areaPhrase(d.code)}. &ldquo;Verified&rdquo; means we have checked the company details, current public liability insurance and any accreditations shown. Others are listed without those checks, and say so.</p>
      {d.list.map((l) => (
        <div className="panel" key={l.id}>
          <h2 style={{ marginTop: 0 }}><Link href={`/b/${l.id}`}>{l.trading_name}</Link></h2>
          <p className="muted" style={{ margin: '0 0 6px' }}>{l.trades.map(tradeLabel).join(', ')}</p>
          {l.verified ? (
            <p className="badges">
              <span className="badge ok">Verified member</span>
              {l.pl_cover_amount && <span className="badge ok">Public liability {gbp(l.pl_cover_amount)}</span>}
              {liveAccreditations(l.accreditations, l.accreditation_expiries).map((a) => <span className="badge ok" key={a}>{accreditationLabel(a)}</span>)}
            </p>
          ) : <p className="muted small">Not verified: we have not checked this business&rsquo;s insurance or accreditations.</p>}
          {l.description && <p>{l.description.length > 220 ? `${l.description.slice(0, 217)}...` : l.description}</p>}
          <p><Link href={`/b/${l.id}`}>View profile</Link></p>
        </div>
      ))}
      <p>Need someone who covers {areaPhrase(d.code)} from further away? <Link href={`/search?trade=${trade}`}>Search by postcode and distance</Link>.</p>
    </div>
  );
}
