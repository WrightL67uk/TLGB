import { siteContext, themeStyle, SiteHeader, SiteFooter, TrustBar, Gone, siteMeta, shortName } from '../parts';
import { loadSiteBySlug, tradesText } from '@/lib/memberSites';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return siteMeta(await loadSiteBySlug((await params).slug), 'Services & work');
}

export default async function SiteServices({ params }: { params: Promise<{ slug: string }> }) {
  const ctx = await siteContext((await params).slug);
  if (ctx.gone) return <Gone b={ctx.business} />;
  const { site, business: b, photos } = ctx;
  return (
    <div className="ms" style={themeStyle(site.theme)}>
      <SiteHeader ctx={ctx} page="services" />
      <section className="ms-block">
        <div className="wrap">
          <p className="ms-eyebrow" style={{ color: 'var(--sa)' }}>Services</p>
          <h2>What we do</h2>
          <p className="sub">{tradesText(b.trades).join(' · ')}</p>
          <div className="ms-grid3">
            {site.services.map((s) => <div key={s.title} className="ms-card"><h3>{s.title}</h3><p>{s.text}</p></div>)}
          </div>
        </div>
      </section>

      {photos.length > 0 && (
        <section className="ms-block ms-soft">
          <div className="wrap">
            <p className="ms-eyebrow" style={{ color: 'var(--sa)' }}>Recent work</p>
            <h2>Our work</h2>
            <div className="ms-gallery">
              {photos.map((p) => (
                <div key={p.path}>
                  <div className="ph"><img className="ms-pic" src={p.url} alt={p.caption ?? `Work by ${shortName(b)}`} loading="lazy" /></div>
                  {p.caption && <p className="ms-cap">{p.caption}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="ms-block">
        <div className="wrap ms-split">
          <div>
            <h2>Where we work</h2>
            <p className="sub" style={{ marginBottom: 0 }}>{site.areas}</p>
          </div>
          <div className="ms-card">
            <h3>Our paperwork, checked</h3>
            <p style={{ marginBottom: 14 }}>Checked by The Little Green Book and kept in date.</p>
            <ul className="ms-ticks">
              {b.accreditations.map((a) => <li key={a}>{a}</li>)}
              <li>Public liability insurance{b.pl_cover_amount ? ` (${b.pl_cover_amount >= 1_000_000 ? `£${b.pl_cover_amount / 1_000_000}m` : `£${b.pl_cover_amount.toLocaleString('en-GB')}`})` : ''}</li>
            </ul>
          </div>
        </div>
      </section>
      <TrustBar b={b} />
      <SiteFooter ctx={ctx} />
    </div>
  );
}
