import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, photoUrl } from '@/lib/supabase';
import { gbp, tradeLabel, turnoverBand, accreditationLabel } from '@/lib/config';
import { daysUntil, fmtDate } from '@/lib/expiries';
import { unverifiedReason, type Pending } from '@/lib/membership';
import { docType, shownStatus, ukDate } from '@/lib/complianceTypes';

// Where to confirm each scheme by hand. None of them offer a public API.
function checkLink(accreditation: string, name: string) {
  const q = encodeURIComponent(name);
  if (/^(CHAS|SMAS|SafeContractor|Acclaim|Constructionline)/.test(accreditation)) return 'https://www.ssipportal.org.uk/';
  return `https://www.google.com/search?q=${q}+${encodeURIComponent(accreditation)}`;
}

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
}: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string; login_link?: string; error?: string }> }) {
  const { id } = await params;
  const { done, login_link, error: formError } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: b } = await db().from('businesses').select('*').eq('id', id).maybeSingle();
  if (!b) notFound();

  const [{ data: docs }, { data: photos }, { data: events }, { data: packDocs }, { count: packLinks }] = await Promise.all([
    db().from('business_documents').select('*').eq('business_id', id).order('created_at'),
    db().from('business_photos').select('*').eq('business_id', id).order('sort_order'),
    db().from('review_events').select('*').eq('business_id', id).order('created_at', { ascending: false }),
    db().from('compliance_docs').select('*').eq('business_id', id).is('archived_at', null).order('created_at'),
    db().from('pack_links').select('id', { count: 'exact', head: true }).eq('business_id', id).is('revoked_at', null),
  ]);
  const packSigned = new Map<string, string>();
  if (packDocs?.length) {
    const { data } = await db().storage.from('compliance').createSignedUrls(packDocs.map((d) => d.storage_path), 600);
    for (const s of data ?? []) if (s.path && s.signedUrl) packSigned.set(s.path, s.signedUrl);
  }
  const packPending = (packDocs ?? []).filter((d) => d.status === 'pending');
  const packOther = (packDocs ?? []).filter((d) => d.status !== 'pending');

  // Private documents: short-lived signed links for the admin only
  const signed = new Map<string, string>();
  if (docs?.length) {
    const { data } = await db().storage.from('documents').createSignedUrls(docs.map((d) => d.storage_path), 600);
    for (const s of data ?? []) if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl);
  }

  const plExpired = b.pl_expiry && new Date(b.pl_expiry) < new Date();
  const pend: Pending = b.pending_dates ?? {};
  const hasPending = !!(pend.pl || pend.el || Object.keys(pend.acc ?? {}).length);
  const accKeys: string[] = [...new Set([...(b.accreditations as string[]), ...Object.keys(pend.acc ?? {})])];
  const statusOf = (d: string | null | undefined) => {
    if (!d) return <span className="muted">no date</span>;
    const days = daysUntil(d);
    if (days < 0) return <span className="warn">EXPIRED</span>;
    if (days <= 30) return <span className="warn">expires in {days} days</span>;
    return <span>confirmed</span>;
  };
  const nameMismatch =
    b.business_type === 'ltd' && b.ch_company_name &&
    b.trading_name.trim().toLowerCase() !== b.ch_company_name.trim().toLowerCase();

  return (
    <div className="admin-detail">
      <p><Link href="/admin">Back to queue</Link></p>
      {done && <p className="ok-box">Saved.</p>}
      {formError && <p className="err big">{formError}</p>}
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
          <h2>Membership</h2>
          <p>
            {b.founding_member ? <strong>Founding member (free)</strong> : <>Status: <strong>{({ none: 'not started', trialing: 'free trial', active: 'paying', past_due: 'payment failed, Stripe retrying', cancelled: 'cancelled' } as Record<string, string>)[b.subscription_status] ?? b.subscription_status}</strong></>}
            {b.paid_until && !b.founding_member && <> until {new Date(b.paid_until).toLocaleDateString('en-GB')}</>}
          </p>
          {b.stripe_customer_id && <p><a href={`https://dashboard.stripe.com/customers/${b.stripe_customer_id}`} target="_blank" rel="noopener">Open in Stripe</a></p>}
          {b.status === 'approved' && (
            <form action="/api/admin/decision" method="post" className="inline">
              <input type="hidden" name="id" value={b.id} />
              <input type="hidden" name="action" value="founding" />
              <input type="hidden" name="founding_member" value={b.founding_member ? 'off' : 'on'} />
              <button type="submit">{b.founding_member ? 'Remove free membership' : 'Make free (founding) member'}</button>
            </form>
          )}
        </section>

        <section className="panel">
          <h2>Insurance and accreditations</h2>
          {(() => {
            const reason = b.status === 'approved' ? unverifiedReason(b) : null;
            return b.status === 'approved' && (
              <p>{reason ? <span className="warn">Shows as UNVERIFIED ({reason === 'insurance' ? 'insurance expired' : 'membership not paid'})</span> : <strong>Verified</strong>}</p>
            );
          })()}
          {hasPending && <p className="warn">The trade has entered new details (marked &ldquo;awaiting check&rdquo;). Open the certificate under Documents, correct the date if needed, then confirm.</p>}
          <p className="muted small">Only the dates confirmed here count on the listing. Each one stops counting on the day it expires.</p>
          <form action="/api/admin/dates" method="post" className="form dates-form">
            <input type="hidden" name="id" value={b.id} />
            <table className="table">
              <thead><tr><th>Item</th><th>Cover</th><th>Expiry date</th><th>Status</th></tr></thead>
              <tbody>
                <tr>
                  <td>Public liability</td>
                  <td><input name="pl_cover" type="number" min={0} step={100000} defaultValue={pend.pl?.cover ?? b.pl_cover_amount ?? ''} required /></td>
                  <td><input name="pl_expiry" type="date" defaultValue={pend.pl?.expiry ?? b.pl_expiry ?? ''} required /></td>
                  <td>{pend.pl ? <span className="warn">awaiting check{b.pl_expiry ? ` (was ${fmtDate(b.pl_expiry)})` : ''}</span> : statusOf(b.pl_expiry)}</td>
                </tr>
                <tr>
                  <td>Employers liability</td>
                  <td><input name="el_cover" type="number" min={0} step={100000} defaultValue={(pend.el ? pend.el.cover : b.el_cover_amount) ?? ''} placeholder="none" /></td>
                  <td><input name="el_expiry" type="date" defaultValue={(pend.el ? pend.el.expiry : b.el_expiry) ?? ''} /></td>
                  <td>{pend.el ? <span className="warn">awaiting check</span> : b.el_cover_amount ? statusOf(b.el_expiry) : <span className="muted">not held</span>}</td>
                </tr>
                {accKeys.map((a) => {
                  const isNew = !b.accreditations.includes(a);
                  const proposed = pend.acc && a in pend.acc;
                  const value = proposed ? pend.acc![a] : b.accreditation_expiries?.[a];
                  return (
                    <tr key={a}>
                      <td><label className="check"><input type="checkbox" name="acc" value={a} defaultChecked /> {accreditationLabel(a)}</label></td>
                      <td><a href={checkLink(a, b.ch_company_name ?? b.trading_name)} target="_blank" rel="noopener" className="small">Check</a></td>
                      <td><input name={`acc_exp__${a}`} type="date" defaultValue={value ?? ''} /></td>
                      <td>{proposed ? <span className="warn">{isNew ? 'new, awaiting check' : 'awaiting check'}</span> : statusOf(value ?? null)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="muted small">Untick an accreditation to remove it, for example if the certificate does not match.</p>
            {b.recheck_required && <label className="check"><input type="checkbox" name="clear_recheck" defaultChecked /> Also mark the listing&rsquo;s other changes as checked</label>}
            <button type="submit" className="primary">Confirm these details</button>
          </form>
        </section>

        <section className="panel" id="pack" style={packPending.length ? { borderColor: 'var(--warn)' } : undefined}>
          <h2>Compliance pack</h2>
          <p className="muted small">{packOther.length} document{packOther.length === 1 ? '' : 's'} live, {packLinks ?? 0} share link{packLinks === 1 ? '' : 's'}.</p>
          {packPending.length === 0 ? <p className="muted">Nothing waiting for a check.</p> : packPending.map((d) => (
            <div key={d.id} className="pack-check">
              <p><strong>{docType(d.doc_type)?.label ?? d.doc_type}</strong>: {d.title}{d.replaces ? ' (replaces the current one)' : ''}<br />
                <a href={packSigned.get(d.storage_path)} target="_blank" rel="noopener">Open {d.file_name}</a>
                <span className="muted small"> Uploaded {ukDate(d.created_at.slice(0, 10))}. Member says it expires {ukDate(d.expiry)}.</span></p>
              <form action="/api/admin/compliance" method="post" className="inline">
                <input type="hidden" name="doc_id" value={d.id} />
                <input type="hidden" name="action" value="check" />
                <input name="title" defaultValue={d.title} aria-label="Name" style={{ maxWidth: 240 }} />
                <input type="date" name="expiry" defaultValue={d.expiry ?? ''} aria-label="Expiry date on the certificate" required />
                <button type="submit" className="primary">Mark as checked</button>
              </form>
              <form action="/api/admin/compliance" method="post" className="inline" style={{ marginTop: 6 }}>
                <input type="hidden" name="doc_id" value={d.id} />
                <input type="hidden" name="action" value="reject" />
                <input name="reason" placeholder="Why it was not accepted (the member sees this)" required />
                <button type="submit" className="danger">Not accepted</button>
              </form>
            </div>
          ))}
          {packOther.length > 0 && (
            <ul className="docs">
              {packOther.map((d) => (
                <li key={d.id}>
                  <a href={packSigned.get(d.storage_path)} target="_blank" rel="noopener">{d.title}</a>
                  <span className="muted small"> {docType(d.doc_type)?.label} · {shownStatus(d).label}{d.expiry ? ` · expires ${ukDate(d.expiry)}` : ''}</span>
                </li>
              ))}
            </ul>
          )}
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
