import { notFound } from 'next/navigation';
import { db, photoUrl } from '@/lib/supabase';
import { gbp, tradeLabel, accreditationLabel } from '@/lib/config';
import { unverifiedReason } from '@/lib/membership';
import '../../contractor.css';
import { liveAccreditations, fmtDate } from '@/lib/expiries';
import Link from 'next/link';
import { getContractor } from '@/lib/contractors';

export const dynamic = 'force-dynamic';

export default async function BusinessPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: b } = await db()
    .from('businesses')
    .select('id, trading_name, business_type, company_number, trades, accreditations, accreditation_expiries, pl_cover_amount, pl_expiry, el_cover_amount, el_expiry, contact_name, email, phone, website, description, base_postcode, radius_miles, status, founding_member, subscription_status')
    .eq('id', id)
    .maybeSingle();

  // Lapsed members and paid members with lapsed insurance keep a public page, marked
  // unverified; listings that never paid have none
  if (!b || b.status !== 'approved' || !(b.founding_member || ['active', 'trialing', 'past_due', 'cancelled'].includes(b.subscription_status))) notFound();
  const reason = unverifiedReason(b);
  const verified = !reason;

  const { data: photos } = await db().from('business_photos').select('storage_path, caption').eq('business_id', id).order('sort_order');
  const me = await getContractor();
  const saved = me ? !!(await db().from('contractor_favourites').select('business_id', { count: 'exact', head: true }).eq('company_id', me.company.id).eq('business_id', id)).count : false;

  return (
    <div className="narrow">
      <h1>{b.trading_name}</h1>
      <p className="muted">{b.trades.map(tradeLabel).join(', ')}</p>
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
          {b.el_cover_amount && <span className="badge">Employers liability {gbp(b.el_cover_amount)}</span>}
          {liveAccreditations(b.accreditations, b.accreditation_expiries).map((a) => (
            <span className="badge" key={a}>{accreditationLabel(a)}{b.accreditation_expiries?.[a] ? ` to ${fmtDate(b.accreditation_expiries[a])}` : ''}</span>
          ))}
        </p>
      ) : (
        <p className="warn"><strong>Unverified.</strong> {reason === 'insurance'
          ? 'This business\u2019s insurance has expired and we have not yet checked a current certificate.'
          : 'This business\u2019s membership has lapsed, so we are no longer checking its insurance and accreditations.'} Ask to see current certificates before you hire.</p>
      )}

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
