import Link from 'next/link';
import { db } from '@/lib/supabase';
import { FREE_MAIL, domainOf } from '@/lib/contractorPlans';
import { getAgencyPlan, referralLink, bodyLabel, creditBalance, type Agency } from '@/lib/agencies';
import { LEVELS } from '@/lib/seekerTypes';
import type { Vacancy } from '@/lib/vacancies';

export const dynamic = 'force-dynamic';

const ukDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

function Act({ id, action, label, extra, ask }: { id: string; action: string; label: string; extra?: Record<string, string>; ask?: string }) {
  return (
    <form method="post" action="/api/admin/agencies" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginRight: 8 }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={action} />
      {extra && Object.entries(extra).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {ask && <input name="reason" placeholder={ask} maxLength={500} style={{ width: 200 }} />}
      <button type="submit">{label}</button>
    </form>
  );
}

export default async function AdminAgencies({ searchParams }: { searchParams: Promise<{ done?: string; error?: string }> }) {
  const sp = await searchParams;
  const [{ data: agencies }, { data: vacs }, plan] = await Promise.all([
    db().from('agencies').select('*').order('created_at', { ascending: false }).limit(500),
    db().from('vacancies').select('*, agencies(name, email, contact_name)').not('agency_id', 'is', null).eq('status', 'pending').order('created_at', { ascending: true }).limit(200),
    getAgencyPlan(),
  ]);
  const all = (agencies ?? []) as Agency[];
  const pending = all.filter((a) => a.status === 'pending');
  const others = all.filter((a) => a.status !== 'pending');
  const balances = new Map(await Promise.all(others.map(async (a) => [a.id, await creditBalance(a.id)] as const)));
  const { data: refRows } = await db().from('agency_referrals').select('agency_id').limit(20000);
  const refCount = (id: string) => (refRows ?? []).filter((r) => r.agency_id === id).length;
  const waitingVacs = (vacs ?? []) as (Vacancy & { agencies: { name: string; email: string; contact_name: string } | null })[];
  const today = new Date().toISOString().slice(0, 10);

  const domainCheck = (a: Agency) => {
    if (FREE_MAIL.test(a.email)) return { ok: false, text: 'personal email address' };
    const e = domainOf(a.email); const w = domainOf(a.website);
    return e && w && (e === w || e.endsWith(`.${w}`) || w.endsWith(`.${e}`)) ? { ok: true, text: 'email matches website' } : { ok: false, text: `email ${e} does not match website ${w ?? '?'}` };
  };
  const roleLabels = (a: Agency) => a.roles.map((k) => LEVELS.find((l) => l.key === k)?.label ?? k).join(', ');

  return (
    <div>
      <p><Link href="/admin">&larr; Back to listings</Link></p>
      <h1>Recruitment agencies</h1>
      {sp.done && <p className="ok-box">Done.</p>}
      {sp.error && <p className="err big">{sp.error}</p>}

      <h2>Plan and credits</h2>
      <form method="post" action="/api/admin/agencies" className="panel" style={{ display: 'grid', gap: 10, maxWidth: 520 }}>
        <input type="hidden" name="action" value="settings" />
        <label>Monthly price (£)<input name="price" type="number" min={1} defaultValue={plan.price} /></label>
        <label>Credits each month<input name="credits" type="number" min={1} defaultValue={plan.credits} /></label>
        <label>Job seekers needed for one free credit<input name="per_referral_credit" type="number" min={1} defaultValue={plan.per_referral_credit} /></label>
        <label>Most free credits an agency can earn in a month<input name="referral_cap" type="number" min={0} defaultValue={plan.referral_cap} /></label>
        <button type="submit" className="primary">Save</button>
        <p className="muted small" style={{ margin: 0 }}>A new price applies to agencies that start the plan after you save. Agencies already on the plan keep the price and credits they signed up with. Unused credits roll over.</p>
      </form>

      <h2 id="vacancies">Vacancies to approve ({waitingVacs.length})</h2>
      {!waitingVacs.length && <p className="muted">None waiting.</p>}
      {waitingVacs.map((v) => (
        <div key={v.id} className="panel" style={{ marginBottom: 12 }}>
          <strong>{v.title}</strong>{v.client_name ? ` (client: ${v.client_name})` : ''} <span className="muted small">from {v.agencies?.name}, {ukDate(v.created_at)}</span><br />
          <span className="muted small">{v.area ?? v.postcode}</span>
          <p style={{ whiteSpace: 'pre-line', margin: '8px 0' }}>{v.description}</p>
          <p className="muted small">Apply: {[v.apply_email, v.apply_phone, v.apply_url].filter(Boolean).join(' / ')}</p>
          <Act id={v.id} action="vacancy-approve" label="Approve and go live" />
          <Act id={v.id} action="vacancy-reject" label="Turn down (credit returned)" ask="Reason, shown to them" />
        </div>
      ))}

      <h2>Agencies waiting for a check ({pending.length})</h2>
      {!pending.length && <p className="muted">None waiting.</p>}
      {pending.map((a) => {
        const chk = domainCheck(a);
        const insuranceOk = a.el_expiry && a.pl_expiry && a.el_expiry >= today && a.pl_expiry >= today;
        return (
          <div key={a.id} className="panel" style={{ marginBottom: 12 }}>
            <strong>{a.name}</strong> &middot; Companies House {a.company_number} ({a.ch_company_name}, {a.ch_status})<br />
            {a.ch_registered_address}<br />
            {a.website && <><a href={a.website} target="_blank" rel="noopener">{a.website}</a> &middot; </>}{a.phone}<br />
            {a.contact_name}{a.job_title ? `, ${a.job_title}` : ''} ({a.email})<br />
            <span className={chk.ok ? 'muted' : 'warn'}>{chk.text}</span><br />
            Places: {roleLabels(a)} &middot; {a.placement_types.join(' and ')} &middot; covers {a.covers}<br />
            <span className={insuranceOk ? 'muted' : 'warn'}>Employers liability to {a.el_expiry ? ukDate(a.el_expiry) : '?'}, public liability to {a.pl_expiry ? ukDate(a.pl_expiry) : '?'}</span><br />
            Bodies: {a.memberships.length ? a.memberships.map(bodyLabel).join(', ') : 'none given'}{a.glaa_licence ? ` · GLAA licence ${a.glaa_licence}` : ''}<br />
            <p style={{ marginTop: 8 }}>
              <Act id={a.id} action="approve" label="Approve" />
              <Act id={a.id} action="reject" label="Reject" ask="Reason, sent to them" />
            </p>
          </div>
        );
      })}

      <h2>Agencies ({others.length})</h2>
      {!others.length ? <p className="muted">No agencies yet.</p> : (
        <table className="table">
          <thead><tr><th>Agency</th><th>Status</th><th>Credits</th><th>Plan</th><th>Referrals</th><th>Link</th><th></th></tr></thead>
          <tbody>
            {others.map((a) => (
              <tr key={a.id}>
                <td><strong>{a.name}</strong><br /><span className="muted small">{a.email}</span></td>
                <td>{a.status}</td>
                <td>{balances.get(a.id) ?? 0}</td>
                <td>{a.subscription_status}</td>
                <td>{refCount(a.id)}</td>
                <td><input readOnly value={referralLink(a.referral_code)} style={{ width: 230 }} aria-label="Referral link" /></td>
                <td>
                  <Act id={a.id} action="credits" label="Add 5 credits" extra={{ amount: '5' }} />
                  {a.status === 'approved' ? <Act id={a.id} action="suspend" label="Suspend" /> : <Act id={a.id} action="approve" label="Approve" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
