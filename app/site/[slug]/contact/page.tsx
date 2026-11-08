import { siteContext, themeStyle, SiteHeader, SiteFooter, Gone, siteMeta } from '../parts';
import { loadSiteBySlug } from '@/lib/memberSites';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return siteMeta(await loadSiteBySlug((await params).slug), 'Get a quote');
}

const KINDS = ['New-build housing', 'Commercial scheme', 'Public sector', 'Maintenance contract', 'Private garden', 'Something else'];

export default async function SiteContact({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ sent?: string; error?: string }> }) {
  const ctx = await siteContext((await params).slug);
  if (ctx.gone) return <Gone b={ctx.business} />;
  const sp = await searchParams;
  const { site, business: b } = ctx;
  return (
    <div className="ms" style={themeStyle(site.theme)}>
      <SiteHeader ctx={ctx} page="contact" />
      <section className="ms-block">
        <div className="wrap ms-split" style={{ alignItems: 'start' }}>
          <div>
            <p className="ms-eyebrow" style={{ color: 'var(--sa)' }}>Get a quote</p>
            <h2>Tell us about the job</h2>
            <p className="ms-sub">Send the site, the scope and your dates. Drawings or a bill of quantities help us price it accurately.</p>
            {sp.sent && <div className="ms-ok"><strong>Thank you, we have your enquiry.</strong> We will be in touch soon.</div>}
            {sp.error && <div className="ms-err">{sp.error}</div>}
            {!sp.sent && (
              <form className="ms-form" method="post" action={ctx.preview ? undefined : '/api/site-enquiry'}>
                <input type="hidden" name="slug" value={site.slug} />
                <label className="ms-hp" aria-hidden="true">Leave this empty<input name="website_url" tabIndex={-1} autoComplete="off" /></label>
                <div className="ms-row2"><label>Your name<input name="name" required maxLength={100} /></label><label>Company<input name="company" maxLength={120} /></label></div>
                <div className="ms-row2"><label>Email<input name="email" type="email" required maxLength={200} /></label><label>Phone<input name="phone" maxLength={30} /></label></div>
                <div className="ms-row2">
                  <label>Site postcode<input name="postcode" maxLength={10} /></label>
                  <label>Type of job<select name="kind">{KINDS.map((k) => <option key={k}>{k}</option>)}</select></label>
                </div>
                <label>About the job<textarea name="message" required maxLength={4000} placeholder="Scope, programme, value if known" /></label>
                <p style={{ fontSize: 13, color: '#5b625c', margin: 0 }}>Your details go to {b.trading_name} so they can reply. The Little Green Book keeps a copy. <a href="https://www.tlgb.co.uk/legal/privacy" target="_blank" rel="noopener">Privacy notice</a></p>
                <div><button className="ms-btn go" type="submit" disabled={ctx.preview}>{ctx.preview ? 'Sending is off in preview' : 'Send enquiry'}</button></div>
              </form>
            )}
          </div>
          <div className="ms-card">
            <h3>Contact</h3>
            {site.show_phone && b.phone && <p style={{ margin: '12px 0' }}><b>Phone</b><br /><a href={`tel:${b.phone.replace(/\s/g, '')}`}>{b.phone}</a></p>}
            {site.show_email && <p style={{ margin: '12px 0' }}><b>Email</b><br /><a href={`mailto:${b.email}`}>{b.email}</a></p>}
            {site.areas && <p style={{ margin: '12px 0' }}><b>Where we work</b><br />{site.areas}</p>}
            {b.website && <p style={{ margin: '12px 0' }}><b>Main website</b><br /><a href={b.website} target="_blank" rel="noopener">{b.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a></p>}
          </div>
        </div>
      </section>
      <SiteFooter ctx={ctx} />
    </div>
  );
}
