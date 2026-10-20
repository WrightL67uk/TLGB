import { notFound } from 'next/navigation';
import { db, photoUrl } from '@/lib/supabase';
import { gbp, tradeLabel, accreditationLabel } from '@/lib/config';
import { liveAccreditations, fmtDate } from '@/lib/expiries';

export const dynamic = 'force-dynamic';

export default async function BusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: b } = await db()
    .from('businesses')
    .select('id, trading_name, business_type, company_number, trades, accreditations, accreditation_expiries, pl_cover_amount, pl_expiry, el_cover_amount, contact_name, email, phone, website, description, base_postcode, radius_miles, status, founding_member, subscription_status')
    .eq('id', id)
    .maybeSingle();

  if (!b || b.status !== 'approved' || !(b.founding_member || b.subscription_status === 'active')) notFound();

  const { data: photos } = await db().from('business_photos').select('storage_path, caption').eq('business_id', id).order('sort_order');

  return (
    <div className="narrow">
      <h1>{b.trading_name}</h1>
      <p className="muted">{b.trades.map(tradeLabel).join(', ')}</p>
      <p className="badges">
        <span className="badge ok">
          {b.business_type === 'ltd' ? `Ltd company ${b.company_number}, Companies House checked` : 'Sole trader, checked'}
        </span>
        <span className="badge ok">Public liability {gbp(b.pl_cover_amount)} to {new Date(b.pl_expiry).toLocaleDateString('en-GB')}</span>
        {b.el_cover_amount && <span className="badge">Employers liability {gbp(b.el_cover_amount)}</span>}
        {liveAccreditations(b.accreditations, b.accreditation_expiries).map((a) => (
          <span className="badge" key={a}>{accreditationLabel(a)}{b.accreditation_expiries?.[a] ? ` to ${fmtDate(b.accreditation_expiries[a])}` : ''}</span>
        ))}
      </p>

      {b.description && <p style={{ whiteSpace: 'pre-line' }}>{b.description}</p>}
      <p className="muted">Based in {b.base_postcode}, covers up to {b.radius_miles} miles.</p>

      <div className="contact">
        <h2>Contact</h2>
        <p>{b.contact_name}<br />
          <a href={`tel:${b.phone}`}>{b.phone}</a><br />
          <a href={`mailto:${b.email}`}>{b.email}</a>
          {b.website && <><br /><a href={b.website} rel="nofollow noopener" target="_blank">{b.website}</a></>}
        </p>
      </div>

      {photos && photos.length > 0 && (
        <>
          <h2>Recent work</h2>
          <div className="gallery">
            {photos.map((p) => <img key={p.storage_path} src={photoUrl(p.storage_path)} alt={p.caption ?? ''} />)}
          </div>
        </>
      )}
    </div>
  );
}
