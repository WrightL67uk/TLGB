import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, photoUrl } from '@/lib/supabase';
import { gbp, tradeLabel, turnoverBand } from '@/lib/config';

export const dynamic = 'force-dynamic';

const DOC_LABEL: Record<string, string> = {
  letterhead: 'Letterhead',
  public_liability: 'Public liability certificate',
  employers_liability: 'Employers liability certificate',
  accreditation: 'Accreditation',
  other: 'Other',
};

export default async function AdminDetail({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string; login_link?: string }> }) {
  const { id } = await params;
  const { done, login_link } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: b } = await db().from('businesses').select('*').eq('id', id).maybeSingle();
  if (!b) notFound();

  const [{ data: docs }, { data: photos }, { data: events }] = await Promise.all([
    db().from('business_documents').select('*').eq('business_id', id).order('created_at'),
    db().from('business_photos').select('*').eq('business_id', id).order('sort_order'),
    db().from('review_events').select('*').eq('business_id', id).order('created_at', { ascending: false }),
  ]);

  // Private documents: short-lived signed links for the admin only
  const signed = new Map<string, string>();
  if (docs?.length) {
    const { data } = await db().storage.from('documents').createSignedUrls(docs.map((d) => d.storage_path), 600);
    for (const s of data ?? []) if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl);
  }

  const plExpired = b.pl_expiry && new Date(b.pl_expiry) < new Date();
  const nameMismatch =
    b.business_type === 'ltd' && b.ch_company_name &&
    b.trading_name.trim().toLowerCase() !== b.ch_company_name.trim().toLowerCase();

  return (
    <div className="admin-detail">
      <p><Link href="/admin">Back to queue</Link></p>
      {done && <p className="ok-box">Saved.</p>}
      {login_link && (
        <div className="ok-box">
          <p><strong>Login link for {b.email}</strong> (works once, for 24 hours):</p>
          <p style={{ overflowWrap: 'anywhere' }}><code>{login_link}</code></p>
          <p className="small">Send it only to this business. Anyone with the link can edit their listing.</p>
        </div>
      )}
      {b.status === 'approved' && b.recheck_required && (
        <section className="panel" style={{ borderColor: 'var(--warn)' }}>
          <h2>Changes to check</h2>
          <p>{b.recheck_reason}</p>
          <p className="muted small">The listing is still live. Check the new details and documents below, then mark as checked, or suspend it if something is wrong.</p>
          <form action="/api/admin/decision" method="post" className="form">
            <input type="hidden" name="id" value={b.id} />
            <input type="hidden" name="action" value="clear_recheck" />
            <label>Note (optional)<input name="notes" /></label>
            <button className="primary" type="submit">Mark as checked</button>
          </form>
        </section>
      )}

      <h1>{b.trading_name} <span className={`status ${b.status}`}>{b.status.replace('_', ' ')}</span></h1>
      <p className="muted">Submitted {new Date(b.created_at).toLocaleString('en-GB')}</p>

      <div className="grid2">
        <section className="panel">
          <h2>Identity check</h2>
          {b.business_type === 'ltd' ? (
            <>
              <p><strong>Limited company</strong></p>
              <p>
                {b.ch_company_name} ({b.company_number})<br />
                Status at application: <strong>{b.ch_status}</strong><br />
                {b.ch_incorporated_on && <>Incorporated {new Date(b.ch_incorporated_on).toLocaleDateString('en-GB')}<br /></>}
                <span className="muted">{b.ch_registered_address}</span>
              </p>
              {nameMismatch && <p className="warn">Trading name differs from the registered name. Check this is a genuine trading name.</p>}
              <p><a href={`https://find-and-update.company-information.service.gov.uk/company/${b.company_number}`} target="_blank" rel="noopener">Open on Companies House</a></p>
            </>
          ) : (
            <>
              <p><strong>Sole trader</strong></p>
              <p>{b.owner_full_name}<br /><span className="muted">{b.business_address}</span></p>
              <p className="warn">Check the letterhead shows this trading name and address, and that the insurance certificate is in the same name.</p>
            </>
          )}
        </section>

        <section className="panel">
          <h2>Contact</h2>
          <p>{b.contact_name}<br />{b.email}<br />{b.phone}<br />{b.website && <a href={b.website} target="_blank" rel="noopener">{b.website}</a>}</p>
          <p>Base {b.base_postcode}, travels {b.radius_miles} miles</p>
          <p>{b.trades.map(tradeLabel).join(', ')}</p>
          <p>Turnover: {turnoverBand(b.turnover_band)?.label ?? 'not given'}
            {turnoverBand(b.turnover_band) && <span className="muted"> (listing £{turnoverBand(b.turnover_band)!.price}/yr)</span>}</p>
        </section>

        <section className="panel">
          <h2>Insurance</h2>
          <p>Public liability {gbp(b.pl_cover_amount)}, expires {b.pl_expiry && new Date(b.pl_expiry).toLocaleDateString('en-GB')}
            {plExpired && <span className="warn"> EXPIRED</span>}</p>
          <p>Employers liability {b.el_cover_amount ? `${gbp(b.el_cover_amount)}, expires ${b.el_expiry ? new Date(b.el_expiry).toLocaleDateString('en-GB') : 'not given'}` : 'not provided'}</p>
          <p>Accreditations claimed: {b.accreditations.length ? b.accreditations.join(', ') : 'none'}</p>
        </section>

        <section className="panel">
          <h2>Documents</h2>
          {!docs?.length ? <p className="muted">None</p> : (
            <ul className="docs">
              {docs.map((d) => (
                <li key={d.id}>
                  <a href={signed.get(d.storage_path)} target="_blank" rel="noopener">{DOC_LABEL[d.doc_type] ?? d.doc_type}</a>
                  <span className="muted small"> {d.file_name}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="muted small">Links expire after 10 minutes. Refresh the page for new ones.</p>
        </section>
      </div>

      {b.description && <section className="panel"><h2>Description</h2><p style={{ whiteSpace: 'pre-line' }}>{b.description}</p></section>}

      {photos && photos.length > 0 && (
        <section className="panel">
          <h2>Photos</h2>
          <div className="gallery">{photos.map((p) => <img key={p.id} src={photoUrl(p.storage_path)} alt="" />)}</div>
        </section>
      )}

      <section className="panel decision">
        <h2>Decision</h2>
        {(b.status === 'pending_review' || b.status === 'suspended' || b.status === 'rejected') && (
          <form action="/api/admin/decision" method="post" className="form">
            <input type="hidden" name="id" value={b.id} />
            <input type="hidden" name="action" value="approve" />
            <label className="check"><input type="checkbox" name="founding_member" defaultChecked={b.founding_member} /> Founding member (free listing)</label>
            <label>Internal note (optional)<textarea name="notes" rows={2} defaultValue={b.admin_notes ?? ''} /></label>
            <button className="primary" type="submit">Approve and email applicant</button>
          </form>
        )}

        {b.status === 'pending_review' && (
          <form action="/api/admin/decision" method="post" className="form">
            <input type="hidden" name="id" value={b.id} />
            <input type="hidden" name="action" value="reject" />
            <label>Reason (sent to the applicant)
              <textarea name="reason" rows={3} required placeholder="e.g. The insurance certificate is in a different name to the letterhead." />
            </label>
            <button className="danger" type="submit">Reject and email applicant</button>
          </form>
        )}

        {b.status === 'approved' && (
          <form action="/api/admin/decision" method="post" className="form">
            <input type="hidden" name="id" value={b.id} />
            <input type="hidden" name="action" value="suspend" />
            <label>Reason (internal)<textarea name="reason" rows={2} required /></label>
            <button className="danger" type="submit">Suspend listing</button>
          </form>
        )}
      </section>

      {b.status !== 'draft' && (
        <section className="panel">
          <h2>Login link</h2>
          <p className="muted small">Makes a one-time login link for this business, for support or for demos before email is set up.</p>
          <form action="/api/admin/decision" method="post">
            <input type="hidden" name="id" value={b.id} />
            <input type="hidden" name="action" value="login_link" />
            <button type="submit">Create login link</button>
          </form>
        </section>
      )}

      {events && events.length > 0 && (
        <section className="panel">
          <h2>History</h2>
          <ul className="history">
            {events.map((e) => (
              <li key={e.id}>
                {new Date(e.created_at).toLocaleString('en-GB')}: <strong>{e.action}</strong> by {e.actor}
                {e.detail && <span className="muted"> ({e.detail})</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
