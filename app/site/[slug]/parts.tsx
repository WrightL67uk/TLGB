import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/supabase';
import { siteUrl } from '@/lib/config';
import { ownedBusiness } from '@/lib/account';
import { loadSiteBySlug, siteAllowed, theme, pounds, insuranceOk, siteAddress, type MemberSite, type SiteBusiness } from '@/lib/memberSites';
import '../site.css';

export type SiteData = NonNullable<Awaited<ReturnType<typeof loadSiteBySlug>>>;
export type SiteContext = SiteData & { base: string; preview: boolean; gone: boolean };

/**
 * Works out who can see this site and the link prefix for its pages.
 * Live sites are public. Drafts and switched-off sites are only shown to their owner, as a preview.
 * Members whose membership has ended get a "no longer available" page.
 */
export async function siteContext(slug: string): Promise<SiteContext> {
  const data = await loadSiteBySlug(slug);
  if (!data) redirect(siteUrl());
  const host = ((await headers()).get('host') ?? '').toLowerCase();
  const onOwnAddress = host.startsWith(`${slug}.`);
  const base = onOwnAddress ? '' : `/site/${slug}`;
  const allowed = siteAllowed(data.business);
  const live = data.site.status === 'live' && allowed;
  if (live) return { ...data, base, preview: false, gone: false };
  const owner = !onOwnAddress && (await ownedBusiness(data.business.id)).ok;
  if (owner) return { ...data, base, preview: true, gone: false };
  if (data.site.status === 'live' && !allowed) return { ...data, base, preview: false, gone: true };
  redirect(siteUrl());
}

export async function countView(site: MemberSite) {
  await db().rpc('bump_site_counter', { p_site: site.id, p_field: 'views' });
}

export const themeStyle = (key: string) => {
  const t = theme(key);
  return { ['--sd' as string]: t.dark, ['--sm' as string]: t.mid, ['--sa' as string]: t.accent, ['--ss' as string]: t.soft, ['--st' as string]: t.tint } as React.CSSProperties;
};

export const shortName = (b: SiteBusiness) => b.trading_name.replace(/\s+(ltd|limited|llp)\.?$/i, '').replace(/\b([A-Z]{2,})\b/g, (w) => w[0] + w.slice(1).toLowerCase());

export function Gone({ b }: { b: SiteBusiness }) {
  return (
    <div className="ms">
      <div className="ms-gone">
        <h1 style={{ fontSize: 30, color: '#14331f' }}>{shortName(b)}</h1>
        <p>This website is not available at the moment.</p>
        <p><a href={`${siteUrl()}/search`} style={{ color: '#2f6b2a', fontWeight: 700 }}>Find checked landscaping trades on The Little Green Book</a></p>
      </div>
    </div>
  );
}

export function SiteHeader({ ctx, page }: { ctx: SiteContext; page: 'home' | 'services' | 'contact' }) {
  const b = ctx.business;
  const name = shortName(b);
  return (
    <>
      {ctx.preview && (
        <div className="ms-preview">
          Preview only. {ctx.site.status === 'live' ? 'Your membership needs to be active for this to be public.' : 'This site is not live yet.'}{' '}
          <a href={`${siteUrl()}/account/${b.id}/website`}>Edit your website</a>
        </div>
      )}
      <header className="ms-head">
        <div className="wrap ms-bar">
          <a className="ms-logo" href={ctx.base || '/'}><i>{name.trim()[0]?.toUpperCase()}</i>{name}</a>
          <nav className="ms-nav">
            <a href={ctx.base || '/'} className={page === 'home' ? 'on' : ''}>Home</a>
            <a href={`${ctx.base}/services`} className={page === 'services' ? 'on' : ''}>Services &amp; work</a>
            <a href={`${ctx.base}/contact`} className="cta">Get a quote</a>
          </nav>
        </div>
      </header>
    </>
  );
}

export function TrustBar({ b }: { b: SiteBusiness }) {
  return (
    <div className="ms-trust">
      <div className="wrap">
        {b.accreditations.map((a) => <span key={a} className="ms-badge"><b>&#10003;</b> {a}</span>)}
        {b.pl_cover_amount && insuranceOk(b) ? <span className="ms-badge"><b>&#10003;</b> {pounds(b.pl_cover_amount)} public liability</span> : null}
        <a className="ms-tlgb" href={`${siteUrl()}/b/${b.id}`} target="_blank" rel="noopener">
          <strong>TLGB Verified</strong> Insurance and accreditations checked by The Little Green Book
        </a>
      </div>
    </div>
  );
}

export function SiteFooter({ ctx }: { ctx: SiteContext }) {
  return (
    <footer className="ms-foot">
      <div className="wrap">
        <span>&copy; {new Date().getFullYear()} {ctx.business.trading_name}</span>
        <span>Website by <a href={siteUrl()} target="_blank" rel="noopener">The Little Green Book</a> · <a href={`${siteUrl()}/legal/privacy`} target="_blank" rel="noopener">Privacy</a></span>
      </div>
    </footer>
  );
}

export function siteMeta(d: SiteData | null, page: string) {
  if (!d) return { title: 'The Little Green Book' };
  const name = shortName(d.business);
  return {
    title: page === 'home' ? `${name} | ${d.site.headline ?? ''}`.trim() : `${page} | ${name}`,
    description: d.site.intro ?? undefined,
    alternates: { canonical: `https://${siteAddress(d.site.slug)}${page === 'home' ? '' : page === 'Services & work' ? '/services' : '/contact'}` },
    robots: d.site.status === 'live' ? undefined : { index: false, follow: false },
    icons: { icon: [] as never[] },
  };
}
