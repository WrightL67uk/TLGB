import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { db, photoUrl } from '@/lib/supabase';
import { ownedBusiness } from '@/lib/account';
import { loadSiteForBusiness, loadBusinessForSite, siteAllowed, suggestSlug, slugOk, siteAddress, siteHref, THEMES } from '@/lib/memberSites';
import SiteEditor, { CreateSite, PublishButtons } from './SiteEditor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your website | TLGB' };

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export default async function WebsitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const own = await ownedBusiness(id);
  if (!own.ok) {
    if (own.status === 401) redirect(`/login?next=/account/${id}/website`);
    notFound();
  }
  const b = await loadBusinessForSite(own.business.id);
  if (!b) notFound();
  const allowed = siteAllowed(b);
  const site = await loadSiteForBusiness(b.id);
  const themes = THEMES.map((t) => ({ key: t.key, label: t.label, dark: t.dark, accent: t.accent }));

  let suggestion = suggestSlug(b.trading_name);
  if (!slugOk(suggestion)) suggestion = `${suggestion}site`.slice(0, 40);
  const { data: taken } = await db().from('member_sites').select('id').eq('slug', suggestion).maybeSingle();
  if (taken) suggestion = `${suggestion.slice(0, 36)}${Math.floor(Math.random() * 900 + 100)}`;

  const [{ data: photos }, { data: enquiries }] = await Promise.all([
    db().from('business_photos').select('storage_path').eq('business_id', b.id).order('sort_order'),
    site ? db().from('site_enquiries').select('id, created_at, name, company, email, phone, postcode, kind, message').eq('site_id', site.id).order('created_at', { ascending: false }).limit(30) : Promise.resolve({ data: [] }),
  ]);
  const live = site?.status === 'live';

  return (
    <div className="narrow" style={{ maxWidth: 900 }}>
      <p className="small"><Link href={`/account/${b.id}`}>Back to my listing</Link></p>
      <h1>Your website</h1>
      <p className="lead">A free three-page website at your own tlgb.co.uk address, built from your listing.</p>

      {!allowed && <div className="panel"><p>Websites are included with paid membership. Once your listing is approved and membership is active, you can make yours here.</p></div>}

      {allowed && !site && <CreateSite businessId={b.id} suggestion={suggestion} themes={themes} />}

      {site && (
        <>
          <section className="panel" style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontSize: '1.15rem' }}><strong>{siteAddress(site.slug)}</strong></p>
                <p style={{ margin: '4px 0 0' }}>
                  {live ? <span className="badge ok">Live</span> : <span className="badge">{site.status === 'off' ? 'Offline' : 'Not published yet'}</span>}
                  {' '}<span className="muted small">{site.views} visit{site.views === 1 ? '' : 's'} · {site.enquiries} enquir{site.enquiries === 1 ? 'y' : 'ies'}</span>
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a className="sq" style={{ background: 'var(--teal)' }} href={live ? siteHref(site.slug) : `/site/${site.slug}`} target="_blank" rel="noopener">{live ? 'View my website' : 'Preview'}</a>
                {allowed && <PublishButtons businessId={b.id} live={live} />}
              </div>
            </div>
            {!live && <p className="muted small" style={{ margin: 0 }}>Check the wording and photos in the preview, then publish. You can edit and republish at any time.</p>}
            {live && <p className="muted small" style={{ margin: 0 }}>Put this address on your vans, email signature and quotes. Enquiries from your website are emailed to {b.email}.</p>}
          </section>

          {allowed && (
            <SiteEditor
              businessId={b.id}
              themes={themes}
              photos={(photos ?? []).map((p) => ({ path: p.storage_path, url: photoUrl(p.storage_path) }))}
              site={{
                slug: site.slug, theme: site.theme, headline: site.headline ?? '', intro: site.intro ?? '', about: site.about ?? '',
                services: site.services ?? [], reasons: site.reasons ?? [], areas: site.areas ?? '', hero_photo: site.hero_photo,
                show_phone: site.show_phone, show_email: site.show_email,
              }}
            />
          )}

          <section className="panel">
            <h2>Enquiries from your website</h2>
            {!enquiries?.length && <p className="muted">None yet. They will appear here and in your email.</p>}
            {enquiries?.map((e) => (
              <div key={e.id} style={{ borderTop: '1px solid var(--line)', padding: '10px 0' }}>
                <p style={{ margin: 0 }}><strong>{e.name}</strong>{e.company ? `, ${e.company}` : ''} <span className="muted small">{when(e.created_at)}</span></p>
                <p style={{ margin: '2px 0' }} className="small"><a href={`mailto:${e.email}`}>{e.email}</a>{e.phone ? ` · ${e.phone}` : ''}{e.postcode ? ` · ${e.postcode}` : ''}{e.kind ? ` · ${e.kind}` : ''}</p>
                <p style={{ margin: '4px 0 0', whiteSpace: 'pre-line' }}>{e.message}</p>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
