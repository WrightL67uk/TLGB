import Link from 'next/link';
import { db } from '@/lib/supabase';
import { seekerLive, seekerName, type Seeker } from '@/lib/seekers';
import { LEVELS, label } from '@/lib/seekerTypes';

export const dynamic = 'force-dynamic';

const ukDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

function Act({ id, action, label: text, reason }: { id: string; action: string; label: string; reason?: boolean }) {
  return (
    <form method="post" action="/api/admin/workers" style={{ display: 'inline-flex', gap: 4 }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={action} />
      {reason && <input name="reason" placeholder="Reason (internal)" style={{ width: 140 }} />}
      <button type="submit">{text}</button>
    </form>
  );
}

export default async function AdminWorkers() {
  const { data } = await db().from('job_seekers').select('*').order('created_at', { ascending: false }).limit(500);
  const rows = (data ?? []) as Seeker[];
  const status = (s: Seeker) => (s.status === 'live' ? (seekerLive(s) ? 'Live' : 'Expired') : s.status === 'draft' ? 'Not finished' : s.status === 'paused' ? 'Paused' : 'Removed');

  return (
    <div>
      <p><Link href="/admin">&larr; Back to listings</Link></p>
      <h1>Job seeker profiles</h1>
      <p className="muted">{rows.filter(seekerLive).length} live, {rows.length} in total. Profiles go live as soon as the job seeker publishes them; remove anything inappropriate here.</p>
      <div style={{ overflowX: "auto" }}>
        <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th align="left">Name</th><th align="left">Summary</th><th align="left">Area</th><th align="left">Status</th><th align="left">Updated</th><th align="left">Views</th><th></th></tr></thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} style={{ borderTop: '1px solid var(--line)' }}>
                <td><Link href={`/workers/${s.id}`}>{seekerName({ ...s, show_full_name: true })}</Link><br /><span className="small muted">{s.email}</span></td>
                <td>{s.headline ?? <span className="muted">Not filled in</span>}<br /><span className="small muted">{label(LEVELS, s.level) ?? ''}</span></td>
                <td>{s.area ?? ''}</td>
                <td>{status(s)}{s.removed_reason ? <><br /><span className="small muted">{s.removed_reason}</span></> : null}</td>
                <td>{ukDate(s.updated_at)}</td>
                <td>{s.view_count}</td>
                <td>
                  {s.status === 'removed'
                    ? <><Act id={s.id} action="restore" label="Restore (paused)" /> <Act id={s.id} action="delete" label="Delete" /></>
                    : <Act id={s.id} action="remove" label="Remove" reason />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
