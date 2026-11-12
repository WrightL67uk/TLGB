import DeleteForm from '@/app/admin/DeleteForm';
import Link from 'next/link';
import { db } from '@/lib/supabase';
import { supplierCategoryLabel, helpKindLabel } from '@/lib/resources';
import { standardLabel, DELIVERY_OPTIONS } from '@/lib/supplierAccount';
import { TIER_INFO } from '@/lib/supplierPricing';

export const dynamic = 'force-dynamic';

const ukDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

function Act({ table, id, action, label }: { table: string; id: string; action: string; label: string }) {
  return (
    <form method="post" action="/api/admin/resources" style={{ display: 'inline' }}>
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={action} />
      <button type="submit">{label}</button>
    </form>
  );
}

export default async function AdminResources({ searchParams }: { searchParams: Promise<{ supplier_error?: string; deleted?: string; delete_error?: string }> }) {
  const sp = await searchParams;
  const [{ data: pendingNew }, { data: enquiries }, { data: help }, { data: approved }, { data: requests }] = await Promise.all([
    db().from('suppliers').select('*').eq('status', 'pending').order('created_at'),
    db().from('service_enquiries').select('id, created_at, service, name, business_name, email, phone, schemes, message, handled').order('created_at', { ascending: false }).limit(100),
    db().from('help_requests').select('id, created_at, email, business_name, kind, title, status').eq('status', 'open').order('created_at', { ascending: false }).limit(100),
    db().from('suppliers').select('id, name, town, email, categories, quote_requests, quote_plan, quote_paid_until, wants_requests, tier, subscription_status, paid_until').eq('status', 'approved').order('name'),
    db().from('quote_requests').select('id, created_at, reference, postcode, status').order('created_at', { ascending: false }).limit(20),
  ]);
  const { data: started } = await db().from('suppliers').select('id, created_at, name, email, tier, subscription_status').eq('status', 'started').order('created_at', { ascending: false });
  const { data: sites } = await db().from('member_sites').select('slug, status, views, enquiries, business_id, updated_at').order('updated_at', { ascending: false }).limit(200);
  const pending = pendingNew ?? (await db().from('suppliers').select('id, created_at, name, categories, description, website, phone, town, postcode, email').eq('status', 'pending').order('created_at')).data?.map((x) => ({ ...x, wants_requests: false }));

  return (
    <div>
      <p><Link href="/admin">&larr; Back to listings</Link></p>
      <h1>Suppliers, enquiries and Help Hub</h1>
      {sp.deleted && <p className="ok-box">Deleted {sp.deleted}.</p>}
      {sp.delete_error && <p className="err big">{sp.delete_error}</p>}

      <h2 id="suppliers">Suppliers waiting for a check ({pending?.length ?? 0})</h2>
      {sp.supplier_error && <p className="err big">{sp.supplier_error}</p>}
      {!pending?.length && <p className="muted">None waiting.</p>}
      {pending?.map((s) => s.tier ? (
        <div key={s.id} className="ok-box" style={{ marginBottom: 12, background: '#fff', border: '1px solid #ddd' }}>
          <strong>{s.name}</strong> <span className="status approved">{TIER_INFO[s.tier as 'appear' | 'match'].label}</span>{' '}
          <span className={['active', 'trialing'].includes(s.subscription_status) ? 'status approved' : 'status rejected'}>{['active', 'trialing'].includes(s.subscription_status) ? 'paid' : `not paid (${s.subscription_status})`}</span><br />
          ({(s.categories ?? []).map(supplierCategoryLabel).join(', ')})<br />
          {s.description}<br />
          {s.about && <><span className="muted">{s.about}</span><br /></>}
          <span className="small">
            {s.business_type === 'ltd' ? <>Limited company {s.ch_company_name} ({s.company_number}), registered {s.ch_registered_address}. Checked on Companies House: {s.ch_status}.</> : <>Sole trader / partnership (no Companies House number).</>}<br />
            VAT: {s.vat_registered ? `registered, ${s.vat_number} (check at gov.uk/check-uk-vat-number)` : 'not registered'}.<br />
            {s.contact_name} &middot; {s.phone} &middot; {s.email} &middot; {s.website ? <a href={s.website} target="_blank" rel="noopener">{s.website}</a> : 'no website'} &middot; {s.address ? `${s.address}, ` : ''}{s.town} {s.postcode}<br />
            {s.delivers_nationally ? 'Delivers nationally. ' : ''}{(s.delivery_options ?? []).map((k: string) => DELIVERY_OPTIONS.find((d) => d.key === k)?.label).filter(Boolean).join('; ')}
            {s.min_order ? ` Minimum order: ${s.min_order}.` : ''}{s.trade_accounts ? ' Trade accounts.' : ''}{s.trade_only ? ' Trade only.' : ''}<br />
            Standards: {[...(s.standards ?? []).map(standardLabel), s.standards_other].filter(Boolean).join('; ') || 'none stated'}. Product liability insurance: {s.product_liability == null ? 'not answered' : s.product_liability ? 'yes' : 'no'}.<br />
            <a href={`/suppliers/${s.slug}`} target="_blank" rel="noopener">Preview profile</a> (only shows publicly once approved) &middot; sent {ukDate(s.submitted_at ?? s.created_at)}
          </span>
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <form method="post" action="/api/admin/supplier-decision" style={{ display: 'inline' }}>
              <input type="hidden" name="id" value={s.id} /><input type="hidden" name="action" value="approve" />
              <button type="submit" className="primary">Approve and go live</button>
            </form>
            <form method="post" action="/api/admin/supplier-decision" style={{ display: 'flex', gap: 6 }}>
              <input type="hidden" name="id" value={s.id} /><input type="hidden" name="action" value="reject" />
              <input name="reason" placeholder="Reason (sent to them)" required style={{ minWidth: 220 }} />
              <button type="submit">Reject and cancel plan</button>
            </form>
            <DeleteForm kind="supplier" id={s.id} name={s.name} from="/admin/resources" what="their listing and pictures" />
          </div>
        </div>
      ) : (
        <div key={s.id} className="ok-box" style={{ marginBottom: 12, background: '#fff', border: '1px solid #ddd' }}>
          <strong>{s.name}</strong> ({s.categories.map(supplierCategoryLabel).join(', ')})<br />
          {s.description}<br />
          {s.website && <><a href={s.website} target="_blank" rel="noopener">{s.website}</a> &middot; </>}
          {s.phone} &middot; {s.town} {s.postcode} &middot; submitted by {s.email} on {ukDate(s.created_at)}
          {s.wants_requests && <><br /><strong>Wants estimate requests.</strong> Switch them on below once approved.</>}
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <Act table="suppliers" id={s.id} action="approve" label="Approve" />
            <Act table="suppliers" id={s.id} action="reject" label="Reject" />
            <DeleteForm kind="supplier" id={s.id} name={s.name} from="/admin/resources" what="their listing" />
          </div>
        </div>
      ))}
      {!!started?.length && (
        <>
          <h3>Signed up, details not sent yet ({started.length})</h3>
          {started.map((s) => <p key={s.id} style={{ margin: '2px 0' }}>{s.name} ({s.email}), {s.tier ? TIER_INFO[s.tier as 'appear' | 'match'].label : 'no plan'}, {['active', 'trialing'].includes(s.subscription_status) ? 'paid' : 'not paid'}, {ukDate(s.created_at)}</p>)}
        </>
      )}

      <h2 id="price-requests">Estimates: which suppliers receive them</h2>
      <p className="muted">Suppliers need an email address and a plan to receive estimate requests. Founding is free; paid needs a &quot;paid until&quot; date and stops after it.</p>
      <table className="table">
        <thead><tr><th>Supplier</th><th>Email for requests</th><th>Plan</th><th>Paid until</th><th></th></tr></thead>
        <tbody>
          {approved?.map((s) => (
            <tr key={s.id}>
              <td><strong>{s.name}</strong>{s.town ? `, ${s.town}` : ''}{s.tier && <> <span className="status approved">{TIER_INFO[s.tier as 'appear' | 'match'].label}{['active', 'trialing', 'past_due'].includes(s.subscription_status) ? '' : ' (lapsed)'}</span></>}<br /><span className="muted small">{s.categories.map(supplierCategoryLabel).join(', ')}</span>{s.wants_requests && !s.quote_requests && <><br /><strong className="small">Asked for estimate requests</strong></>}</td>
              <td colSpan={4}>
                <form method="post" action="/api/admin/suppliers" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input type="hidden" name="id" value={s.id} />
                  <input name="email" type="email" defaultValue={s.email ?? ''} placeholder="sales@..." style={{ minWidth: 200 }} />
                  <select name="plan" defaultValue={s.quote_requests ? s.quote_plan ?? 'founding' : 'off'}>
                    <option value="off">Off</option>
                    <option value="founding">Founding (free)</option>
                    <option value="paid">Paid</option>
                  </select>
                  <input name="paid_until" type="date" defaultValue={s.quote_paid_until ?? ''} />
                  <button type="submit">Save</button>
                </form>
                <DeleteForm kind="supplier" id={s.id} name={s.name} from="/admin/resources" what="their listing, estimates and ratings" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Latest estimate requests</h3>
      {!requests?.length && <p className="muted">None yet.</p>}
      {requests?.map((q) => <p key={q.id} style={{ margin: '2px 0' }}>{ukDate(q.created_at)}: {q.reference} ({q.postcode}), {q.status}</p>)}

      <h2>Member websites</h2>
      {!sites?.length && <p className="muted">None yet.</p>}
      {sites?.map((m) => (
        <p key={m.slug} style={{ margin: '2px 0' }}>
          <a href={m.status === 'live' ? `https://${m.slug}.tlgb.co.uk` : `/site/${m.slug}`} target="_blank" rel="noopener">{m.slug}.tlgb.co.uk</a> · {m.status} · {m.views} visits · {m.enquiries} enquiries · <Link href={`/admin/${m.business_id}`}>listing</Link>
        </p>
      ))}

      <h2>Accreditation help enquiries</h2>
      {!enquiries?.length && <p className="muted">None yet.</p>}
      {!!enquiries?.length && (
        <table className="table">
          <thead><tr><th>Date</th><th>Who</th><th>Schemes</th><th>Message</th><th></th></tr></thead>
          <tbody>
            {enquiries.map((e) => (
              <tr key={e.id} style={{ opacity: e.handled ? 0.5 : 1 }}>
                <td>{ukDate(e.created_at)}</td>
                <td>{e.name}{e.business_name ? `, ${e.business_name}` : ''}<br /><a href={`mailto:${e.email}`}>{e.email}</a><br />{e.phone}</td>
                <td>{e.schemes.join(', ')}</td>
                <td style={{ whiteSpace: 'pre-line' }}>{e.message}</td>
                <td>{!e.handled && <Act table="service_enquiries" id={e.id} action="handled" label="Mark handled" />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Open Help Hub requests</h2>
      {!help?.length && <p className="muted">None open.</p>}
      {!!help?.length && (
        <table className="table">
          <thead><tr><th>Date</th><th>Request</th><th>Posted by</th><th></th></tr></thead>
          <tbody>
            {help.map((h) => (
              <tr key={h.id}>
                <td>{ukDate(h.created_at)}</td>
                <td>{helpKindLabel(h.kind)}: {h.title}</td>
                <td>{h.business_name ?? ''} {h.email}</td>
                <td><Act table="help_requests" id={h.id} action="remove" label="Remove" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
