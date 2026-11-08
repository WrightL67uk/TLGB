import DeleteForm from '@/app/admin/DeleteForm';
import Link from 'next/link';
import { db } from '@/lib/supabase';
import { supplierCategoryLabel, helpKindLabel } from '@/lib/resources';

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
    db().from('suppliers').select('id, created_at, name, categories, description, website, phone, town, postcode, email, wants_requests').eq('status', 'pending').order('created_at'),
    db().from('service_enquiries').select('id, created_at, service, name, business_name, email, phone, schemes, message, handled').order('created_at', { ascending: false }).limit(100),
    db().from('help_requests').select('id, created_at, email, business_name, kind, title, status').eq('status', 'open').order('created_at', { ascending: false }).limit(100),
    db().from('suppliers').select('id, name, town, email, categories, quote_requests, quote_plan, quote_paid_until, wants_requests').eq('status', 'approved').order('name'),
    db().from('quote_requests').select('id, created_at, reference, postcode, status').order('created_at', { ascending: false }).limit(20),
  ]);
  const { data: sites } = await db().from('member_sites').select('slug, status, views, enquiries, business_id, updated_at').order('updated_at', { ascending: false }).limit(200);
  const pending = pendingNew ?? (await db().from('suppliers').select('id, created_at, name, categories, description, website, phone, town, postcode, email').eq('status', 'pending').order('created_at')).data?.map((x) => ({ ...x, wants_requests: false }));

  return (
    <div>
      <p><Link href="/admin">&larr; Back to listings</Link></p>
      <h1>Suppliers, enquiries and help board</h1>
      {sp.deleted && <p className="ok-box">Deleted {sp.deleted}.</p>}
      {sp.delete_error && <p className="err big">{sp.delete_error}</p>}

      <h2>Suppliers waiting for a check ({pending?.length ?? 0})</h2>
      {!pending?.length && <p className="muted">None waiting.</p>}
      {pending?.map((s) => (
        <div key={s.id} className="ok-box" style={{ marginBottom: 12, background: '#fff', border: '1px solid #ddd' }}>
          <strong>{s.name}</strong> ({s.categories.map(supplierCategoryLabel).join(', ')})<br />
          {s.description}<br />
          {s.website && <><a href={s.website} target="_blank" rel="noopener">{s.website}</a> &middot; </>}
          {s.phone} &middot; {s.town} {s.postcode} &middot; submitted by {s.email} on {ukDate(s.created_at)}
          {s.wants_requests && <><br /><strong>Wants price requests.</strong> Switch them on below once approved.</>}
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <Act table="suppliers" id={s.id} action="approve" label="Approve" />
            <Act table="suppliers" id={s.id} action="reject" label="Reject" />
            <DeleteForm kind="supplier" id={s.id} name={s.name} from="/admin/resources" what="their listing" />
          </div>
        </div>
      ))}

      <h2 id="price-requests">Price requests: which suppliers receive them</h2>
      <p className="muted">Suppliers need an email address and a plan to receive price requests. Founding is free; paid needs a &quot;paid until&quot; date and stops after it.</p>
      {sp.supplier_error && <p className="err big">{sp.supplier_error}</p>}
      <table className="table">
        <thead><tr><th>Supplier</th><th>Email for requests</th><th>Plan</th><th>Paid until</th><th></th></tr></thead>
        <tbody>
          {approved?.map((s) => (
            <tr key={s.id}>
              <td><strong>{s.name}</strong>{s.town ? `, ${s.town}` : ''}<br /><span className="muted small">{s.categories.map(supplierCategoryLabel).join(', ')}</span>{s.wants_requests && !s.quote_requests && <><br /><strong className="small">Asked for price requests</strong></>}</td>
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
                <DeleteForm kind="supplier" id={s.id} name={s.name} from="/admin/resources" what="their listing, quotes and ratings" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Latest price requests</h3>
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

      <h2>Open help board requests</h2>
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
