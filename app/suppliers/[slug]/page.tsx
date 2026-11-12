import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { db, photoUrl } from '@/lib/supabase';
import { supplierCategoryLabel, shortUrl } from '@/lib/resources';
import { hasProfile, photosFor, standardLabel, type Supplier } from '@/lib/supplierAccount';
import { DELIVERY_OPTIONS } from '@/lib/supplierOptions';
import { ratingsFor } from '@/lib/quotes';
import '../../resources.css';
import '../supplier.css';

export const dynamic = 'force-dynamic';

async function load(slug: string) {
  const { data } = await db().from('suppliers').select('*').eq('slug', slug).maybeSingle();
  const s = data as Supplier | null;
  return s && hasProfile(s) ? s : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const s = await load((await params).slug);
  if (!s) return { title: 'Supplier not found | The Little Green Book' };
  return { title: `${s.name} | Landscape supplier | The Little Green Book`, description: s.description ?? undefined };
}

/** A paying supplier's company profile: pictures, company information and contact details. */
export default async function SupplierProfile({ params }: { params: Promise<{ slug: string }> }) {
  const s = await load((await params).slug);
  if (!s) notFound();
  const [photos, ratings] = await Promise.all([photosFor(s.id), ratingsFor([s.id])]);
  const rating = ratings[s.id];
  const mail = s.public_email || s.email;
  const facts: [string, string][] = [
    ...(s.year_established ? [['Established', String(s.year_established)] as [string, string]] : []),
    ...(s.min_order ? [['Minimum order', s.min_order] as [string, string]] : []),
    ['Delivery', [s.delivers_nationally ? 'Nationwide' : null, ...s.delivery_options.map((k) => DELIVERY_OPTIONS.find((d) => d.key === k)?.label)].filter(Boolean).join(' · ') || 'Ask for details'],
    ['Customers', s.trade_only ? 'Trade only' : 'Trade and public'],
    ...(s.trade_accounts ? [['Accounts', 'Trade accounts and credit terms available'] as [string, string]] : []),
    ...(s.ch_company_name ? [['Company', `${s.ch_company_name} (${s.company_number})`] as [string, string]] : []),
  ];
  const standards = [...s.standards.map(standardLabel), ...(s.standards_other ? [s.standards_other] : []), ...(s.product_liability ? ['Holds product liability insurance (stated by supplier)'] : [])];

  return (
    <div className="sup-profile">
      <p className="small"><Link href="/suppliers">&larr; All suppliers</Link></p>
      <div className="sup-head">
        {s.logo_path && <img src={photoUrl(s.logo_path)} alt={`${s.name} logo`} className="sup-logo" />}
        <div>
          <h1>{s.name}</h1>
          <div className="badges">
            {s.categories.map((c) => <span key={c} className="badge ok">{supplierCategoryLabel(c)}</span>)}
            {s.ch_company_name && <span className="badge ok" title="Checked on Companies House">Company checked</span>}
            {s.quote_requests && <span className="badge ok">takes price requests</span>}
            {rating && <span className="badge"><span style={{ color: '#c98a00' }}>★</span> {rating.avg.toFixed(1)} from {rating.count} order{rating.count === 1 ? '' : 's'}</span>}
          </div>
          {s.description && <p className="lead" style={{ marginTop: 10 }}>{s.description}</p>}
        </div>
      </div>

      {photos.length > 0 && (
        <div className="sup-gallery big">
          {photos.map((p) => (
            <figure key={p.id} className="sup-pic">
              <img src={photoUrl(p.storage_path)} alt={p.caption ?? `${s.name} product`} loading="lazy" />
              {p.caption && <figcaption>{p.caption}</figcaption>}
            </figure>
          ))}
        </div>
      )}

      <div className="sup-cols">
        <div>
          {s.about && <><h2>About {s.name}</h2><p style={{ whiteSpace: 'pre-line' }}>{s.about}</p></>}
          {standards.length > 0 && <><h2>Standards and assurance</h2><ul>{standards.map((x) => <li key={x}>{x}</li>)}</ul></>}
        </div>
        <aside className="panel sup-contact">
          <h2 style={{ marginTop: 0 }}>Contact</h2>
          {s.contact_name && <p style={{ margin: '0 0 6px' }}><strong>{s.contact_name}</strong></p>}
          {s.phone && <p style={{ margin: '0 0 6px' }}><a href={`tel:${s.phone.replace(/\s/g, '')}`}>{s.phone}</a></p>}
          {mail && <p style={{ margin: '0 0 6px' }}><a href={`mailto:${mail}`}>{mail}</a></p>}
          {s.website && <p style={{ margin: '0 0 6px' }}><a href={s.website} target="_blank" rel="noopener">{shortUrl(s.website)}</a></p>}
          {(s.address || s.town) && <p className="muted small" style={{ margin: '8px 0 0' }}>{[s.address, s.town, s.postcode].filter(Boolean).join(', ')}</p>}
          <dl className="sup-facts">{facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        </aside>
      </div>
    </div>
  );
}
