import Link from 'next/link';
import { db } from '@/lib/supabase';
import { PLANS } from '@/lib/contractorPlans';
import { FREE_MAIL, domainOf } from '@/lib/contractorPlans';

export const dynamic = 'force-dynamic';

const ukDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

function Act({ id, action, label, extra }: { id: string; action: string; label: string; extra?: Record<string, string> }) {
  return (
    <form method="post" action="/api/admin/contractors" style={{ display: 'inline' }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={action} />
      {extra && Object.entries(extra).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button type="submit">{label}</button>
    </form>
  );
}

export default async function AdminContractors() {
  const [{ data: companies }, { data: users }, { data: jobs }, { data: reports }] = await Promise.all([
    db().from('contractor_companies').select('*').order('created_at', { ascending: false }).limit(500),
    db().from('contractor_users').select('company_id, name, email, job_title, role').is('removed_at', null),
    db().from('contractor_jobs').select('id, company_id, title, status, published_at, notified_count, created_at').neq('status', 'draft').order('created_at', { ascending: false }).limit(200),
    db().from('contractor_job_reports').select('job_id, email, reason, created_at').order('created_at', { ascending: false }).limit(100),
  ]);
  const all = companies ?? [];
  const pending = all.filter((c) => c.status === 'pending');
  const others = all.filter((c) => c.status !== 'pending');
  const name = (cid: string) => all.find((c) => c.id === cid)?.name ?? '';
  const people = (cid: string) => (users ?? []).filter((u) => u.company_id === cid);

  const domainCheck = (c: { website: string | null }, email: string) => {
    if (FREE_MAIL.test(email)) return { ok: false, text: 'personal email address' };
    const e = domainOf(email); const w = domainOf(c.website);
    return e && w && (e === w || e.endsWith(`.${w}`) || w.endsWith(`.${e}`)) ? { ok: true, text: 'email matches website' } : { ok: false, text: `email ${e} does not match website ${w ?? '?'}` };
  };

  return (
    <div>
      <p><Link href="/admin">&larr; Back to listings</Link></p>
      <h1>Main contractors</h1>

      <h2>Waiting for a check ({pending.length})</h2>
      {!pending.length && <p className="muted">None waiting.</p>}
      {pending.map((c) => {
        const owner = people(c.id)[0];
        const chk = owner ? domainCheck(c, owner.email) : null;
        return (
          <div key={c.id} className="panel" style={{ marginBottom: 12 }}>
            <strong>{c.name}</strong> &middot; Companies House {c.company_number} ({c.ch_company_name}, {c.ch_status})<br />
            {c.ch_registered_address}<br />
            {c.website && <><a href={c.website} target="_blank" rel="noopener">{c.website}</a> &middot; </>}{c.phone}<br />
            {owner && <>{owner.name}{owner.job_title ? `, ${owner.job_title}` : ''} ({owner.email})<br /></>}
            {chk && <span className={chk.ok ? 'muted' : 'warn'}>{chk.text}</span>}
            <p className="small muted">Signed up {ukDate(c.created_at)}. <a href={`https://find-and-update.company-information.service.gov.uk/company/${c.company_number}`} target="_blank" rel="noopener">Companies House record</a></p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <Act id={c.id} action="approve" label="Approve" />
              <form method="post" action="/api/admin/contractors" style={{ display: 'flex', gap: 6 }}>
                <input type="hidden" name="id" value={c.id} /><input type="hidden" name="action" value="reject" />
                <input name="reason" placeholder="Reason (sent to them)" maxLength={500} />
                <button type="submit">Reject</button>
              </form>
            </div>
          </div>
        );
      })}

      <h2>Reported jobs</h2>
      {!reports?.length && <p className="muted">No reports.</p>}
      {(reports ?? []).map((r, i) => {
        const j = (jobs ?? []).find((x) => x.id === r.job_id);
        return <p key={i}>{ukDate(r.created_at)}: <Link href={`/jobs/${r.job_id}`}>{j?.title ?? r.job_id}</Link> reported by {r.email}. {r.reason}</p>;
      })}

      <h2>Jobs ({jobs?.length ?? 0})</h2>
      <table className="table">
        <thead><tr><th>Posted</th><th>Contractor</th><th>Job</th><th>Status</th><th>Sent to</th><th></th></tr></thead>
        <tbody>
          {(jobs ?? []).map((j) => (
            <tr key={j.id}>
              <td>{j.published_at ? ukDate(j.published_at) : ''}</td>
              <td>{name(j.company_id)}</td>
              <td><Link href={`/jobs/${j.id}`}>{j.title}</Link></td>
              <td>{j.status}</td>
              <td>{j.notified_count}</td>
              <td>{j.status === 'removed' ? <Act id={j.id} action="job-restore" label="Restore (closed)" /> : <Act id={j.id} action="job-remove" label="Take down" />}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>All contractors ({others.length})</h2>
      <table className="table">
        <thead><tr><th>Company</th><th>Status</th><th>Plan</th><th>People</th><th></th></tr></thead>
        <tbody>
          {others.map((c) => (
            <tr key={c.id}>
              <td><strong>{c.name}</strong><br /><span className="small muted">{c.company_number} &middot; joined {ukDate(c.created_at)}{c.founding ? ' · founding' : ''}</span></td>
              <td>{c.status}{c.rejection_reason ? <><br /><span className="small muted">{c.rejection_reason}</span></> : null}</td>
              <td>
                <form method="post" action="/api/admin/contractors" style={{ display: 'flex', gap: 4 }}>
                  <input type="hidden" name="id" value={c.id} /><input type="hidden" name="action" value="plan" />
                  <select name="plan" defaultValue={c.plan}>{Object.entries(PLANS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}</select>
                  <button type="submit">Set</button>
                </form>
              </td>
              <td className="small">{people(c.id).map((u) => <div key={u.email}>{u.name} ({u.email}){u.role === 'owner' ? ', owner' : ''}</div>)}</td>
              <td style={{ whiteSpace: 'nowrap' }}>
                {c.status === 'approved' && <Act id={c.id} action="suspend" label="Suspend" />}
                {c.status === 'suspended' && <Act id={c.id} action="unsuspend" label="Unsuspend" />}
                {c.status === 'rejected' && <Act id={c.id} action="approve" label="Approve" />}
                {' '}<Act id={c.id} action="founding" label={c.founding ? 'Remove founding' : 'Make founding'} extra={{ on: c.founding ? '0' : '1' }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
