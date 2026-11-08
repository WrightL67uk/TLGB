import { siteContext, countView, themeStyle, SiteHeader, SiteFooter, TrustBar, Gone, siteMeta, shortName } from './parts';
import { loadSiteBySlug, sinceYear } from '@/lib/memberSites';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return siteMeta(await loadSiteBySlug((await params).slug), 'home');
}

export default async function SiteHome({ params }: { params: Promise<{ slug: string }> }) {
  const ctx = await siteContext((await params).slug);
  if (ctx.gone) return <Gone b={ctx.business} />;
  if (!ctx.preview) await countView(ctx.site);
  const { site, business: b, photos } = ctx;
  const hero = photos.find((p) => p.path === site.hero_photo) ?? photos[0];
  const second = photos.find((p) => p !== hero);
  const since = sinceYear(b);
  return (
    <div className="ms" style={themeStyle(site.theme)}>
      <SiteHeader ctx={ctx} page="home" />
      <div className="ms-hero">
        <div className="wrap">
          <div>
            {b.trades.length > 0 && <p className="ms-eyebrow">{site.areas ? site.areas.replace(/\.$/, '') : shortName(b)}</p>}
            <h1>{site.headline}</h1>
            {site.intro && <p className="ms-lead">{site.intro}</p>}
            <a className="ms-btn go" href={`${ctx.base}/contact`}>Ask for a price</a>
            <a className="ms-btn ghost" href={`${ctx.base}/services`}>See our work</a>
          </div>
          {hero && <img className="ms-pic" src={hero.url} alt={hero.caption ?? `Work by ${shortName(b)}`} />}
        </div>
      </div>
      <TrustBar b={b} />

      {site.services.length > 0 && (
        <section className="ms-block">
          <div className="wrap">
            <h2>What we do</h2>
            <div className="ms-grid3">
              {site.services.slice(0, 3).map((s) => <div key={s.title} className="ms-card"><h3>{s.title}</h3><p>{s.text}</p></div>)}
            </div>
            {site.services.length > 3 && <p style={{ marginTop: 20 }}><a href={`${ctx.base}/services`} style={{ fontWeight: 700, color: 'var(--sm)' }}>All our services &rarr;</a></p>}
          </div>
        </section>
      )}

      <section className="ms-block ms-soft">
        <div className="wrap ms-split">
          {second ? <img className="ms-pic" style={{ height: 360 }} src={second.url} alt={second.caption ?? ''} /> : <div />}
          <div>
            <h2>About us</h2>
            <div className="ms-about">{(site.about ?? '').split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}</div>
            {site.reasons.length > 0 && <ul className="ms-ticks" style={{ marginTop: 16 }}>{site.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
            {since && <p style={{ marginTop: 16, color: '#5b625c' }}>Trading since {since}.</p>}
          </div>
        </div>
      </section>

      <div className="ms-band"><div className="wrap"><h2>Got a job you would like priced?</h2><a className="ms-btn go" href={`${ctx.base}/contact`}>Send us the details</a></div></div>
      <SiteFooter ctx={ctx} />
    </div>
  );
}
