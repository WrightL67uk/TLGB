import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { siteUrl } from '@/lib/config';
import { areaOf, areaName } from '@/lib/seo';
import { db, photoUrl } from '@/lib/supabase';
import { isNationwide, gbp, tradeLabel, accreditationLabel } from '@/lib/config';
import { unverifiedReason } from '@/lib/membership';
import '../../contractor.css';
import { liveAccreditations, fmtDate } from '@/lib/expiries';
import Link from 'next/link';
import { getContractor } from '@/lib/contractors';
import ReportButton from '@/app/ReportButton';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { title: 'Not found | The Little Green Book', robots: { index: false } };
  const { data: b } = await db().from('businesses').select('trading_name, trades, description, base_postcode, status, founding_member, subscription_status, free_listing').eq('id', id).maybeSingle();
  if (!b || b.status !== 'approved' || !(b.founding_member || b.free_listing || ['active', 'trialing', 'past_due', 'cancelled'].includes(b.subscription_status))) return { title: 'Not found | The Little Green Book', robots: { index: false } };
  const area = areaOf(b.base_postcode);
  const place = area ? ` in the ${areaName(area)} area` : '';
  const trades = (b.trades as string[]).map(tradeLabel).join(', ');
  return {
    title: `${b.trading_name} | ${trades}${area ? `, ${areaName(area)}` : ''} | The Little Green Book`,
    description: (b.description as string | null)?.slice(0, 155) || `${b.trading_name}: ${trades}${place}. See insurance, accreditations and how to get in touch on The Little Green Book.`,
    alternates: { canonical: `/b/${id}` },
  };
}

export default async function BusinessPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: b } = await db()
    .from('businesses')
    .select('id, trading_name, business_type, company_number, trades, accreditations, accreditation_expiries, pl_cover_amount, pl_expiry, el_cover_amount, el_expiry, contact_name, email, phone, website, description, base_postcode, radius_miles, status, founding_member, subscription_status, free_listing')
    .eq('id', id)
    .maybeSingle();

  // Lapsed members and paid members with lapsed insurance keep a public page, marked
  // unverified, as do free listings; listings that never paid or chose free have none
  if (!b || b.status !== 'approved' || !(b.founding_member || b.free_listing || ['active', 'trialing', 'past_due', 'cancelled'].includes(b.subscription_status))) notFound();
  const reason = unverifiedReason(b);
  const verified = !reason;

  const { data: ot } = await db().from('businesses').select('other_trade, other_trade_ok').eq('id', id).maybeSingle();
  const { data: photos } = await db().from('business_photos').select('storage_path, caption').eq('business_id', id).order('sort_order');
  const { data: lg } = verified ? await db().from('businesses').select('logo_path').eq('id', id).maybeSingle() : { data: null };
  const logo = (lg as { logo_path?: string | null } | null)?.logo_path ?? null;
  const me = await getContractor();
  const saved = me ? !!(await db().from('contractor_favourites').select('business_id', { count: 'exact', head: true }).eq('company_id', me.company.id).eq('business_id', id)).count : false;

  const area = areaOf(b.base_postcode);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: b.trading_name,
    url: `${siteUrl()}/b/${b.id}`,
    ...(b.description ? { description: b.description } : {}),
    ...(logo ? { image: photoUrl(logo) } : {}),
    ...(area ? { areaServed: `${areaName(area)} area, UK` } : {}),
    knowsAbout: b.trades.map(tradeLabel),
  };

  return (
    <div className="narrow">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      {logo && <img src={photoUrl(logo)} alt={`${b.trading_name} logo`} className="listing-logo" />}
      <h1>{b.trading_name}</h1>
      <p className="muted">{[...b.trades.map(tradeLabel), ...(ot?.other_trade && ot.other_trade_ok ? [ot.other_trade as string] : [])].join(', ')}</p>
      {me && error && <p className="err big">{error}</p>}
      {me && (
        <div className="save-box">
          {saved ? <span><strong>On your shortlist.</strong> <Link href="/contractor/shortlist">Open shortlist</Link></span> : <span>Main contractor tools:</span>}
          <form method="post" action="/api/contractor/action">
            <input type="hidden" name="action" value={saved ? 'fav-remove' : 'fav-add'} />
            <input type="hidden" name="back" value={`/b/${b.id}`} />
            <input type="hidden" name="business_id" value={b.id} />
            <button type="submit" className={saved ? '' : 'primary'}>{saved ? 'Remove from shortlist' : 'Save to shortlist'}</button>
          </form>
        </div>
      )}
      {verified ? (
        <p className="badges">
          <span className="badge ok">Verified member</span>
          <span className="badge ok">
            {b.business_type === 'ltd' ? `Ltd company ${b.company_number}, Companies House checked` : 'Sole trader, checked'}
          </span>
          <span className="badge ok">Public liability {gbp(b.pl_cover_amount)} to {new Date(b.pl_expiry).toLocaleDateString('en-GB')}</span>
          {b.el_cover_amount && <span className="badge ok">Employers liability {gbp(b.el_cover_amount)}</span>}
          {liveAccreditations(b.accreditations, b.accreditation_expiries).map((a) => (
            <span className="badge ok" key={a}>{accreditationLabel(a)}{b.accreditation_expiries?.[a] ? ` to ${fmtDate(b.accreditation_expiries[a])}` : ''}</span>
          ))}
        </p>
      ) : (
        <p className="warn"><strong>Unverified.</strong> {reason === 'insurance'
          ? 'This business\u2019s insurance has expired and we have not yet checked a current certificate.'
          : reason === 'free'
          ? 'This is a free listing. We have not checked this business\u2019s insurance or accreditations.'
          : 'This business\u2019s membership has lapsed, so we are no longer checking its insurance and accreditations.'} Ask to see current certificates before you hire.</p>
      )}

      {b.description && <p style={{ whiteSpace: 'pre-line' }}>{b.description}</p>}
      <p className="muted">Based in {b.base_postcode}, {isNationwide(b.radius_miles) ? 'covers the whole UK.' : `covers up to ${b.radius_miles} miles.`}</p>

      <div className="contact">
        <h2>Contact</h2>
        <p>{b.contact_name}<br />
          <a href={`tel:${b.phone}`}>{b.phone}</a><br />
          <a href={`mailto:${b.email}`}>{b.email}</a>
          {b.website && <><br /><a href={b.website} rel="nofollow noopener" target="_blank">{b.website}</a></>}
        </p>
        <ReportButton kind="trade" id={b.id} name={b.trading_name} />
      </div>

      {photos && photos.length > 0 && (
        <>
          <h2>Recent work</h2>
          <div className="gallery">
            {photos.map((p) => <img key={p.storage_path} src={photoUrl(p.storage_path)} alt={p.caption || `${b.trading_name}, ${(b.trades ?? []).map(tradeLabel).join(', ') || 'work'} photo`} />)}
          </div>
        </>
      )}
    </div>
  );
}
