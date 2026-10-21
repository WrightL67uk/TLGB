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

export default async function AdminResources() {
  const [{ data: pending }, { data: enquiries }, { data: help }] = await Promise.all([
    db().from('suppliers').select('id, created_at, name, categories, description, website, phone, town, postcode, email').eq('status', 'pending').order('created_at'),
    db().from('service_enquiries').select('id, created_at, service, name, business_name, email, phone, schemes, message, handled').order('created_at', { ascending: false }).limit(100),
    db().from('help_requests').select('id, created_at, email, business_name, kind, title, status').eq('status', 'open').order('created_at', { ascending: false }).limit(100),
  ]);

  return (
    <div>
      <p><Link href="/admin">&larr; Back to listings</Link></p>
      <h1>Suppliers, enquiries and help board</h1>

      <h2>Suppliers waiting for a check ({pending?.length ?? 0})</h2>
      {!pending?.length && <p className="muted">None waiting.</p>}
      {pending?.map((s) => (
        <div key={s.id} className="ok-box" style={{ marginBottom: 12, background: '#fff', border: '1px solid #ddd' }}>
          <strong>{s.name}</strong> ({s.categories.map(supplierCategoryLabel).join(', ')})<br />
          {s.description}<br />
          {s.website && <><a href={s.website} target="_blank" rel="noopener">{s.website}</a> &middot; </>}
          {s.phone} &middot; {s.town} {s.postcode} &middot; submitted by {s.email} on {ukDate(s.created_at)}
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <Act table="suppliers" id={s.id} action="approve" label="Approve" />
            <Act table="suppliers" id={s.id} action="reject" label="Reject" />
          </div>
        </div>
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
