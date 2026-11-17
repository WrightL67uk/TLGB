import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Ticks, Pick } from '@/app/recruitment/FormBits';
import { db } from '@/lib/supabase';
import { getSessionEmail } from '@/lib/session';
import { agencyByEmail, creditBalance } from '@/lib/agencies';
import { LEVELS, SKILL_GROUPS, WORK_TYPES, PAY_PERIODS, payText } from '@/lib/seekerTypes';
import { QUAL_TYPES, QUAL_GROUPS } from '@/lib/teamTypes';
import { ukDate } from '@/lib/complianceTypes';
import { vacancyLive, VACANCY_LIVE_DAYS, type Vacancy } from '@/lib/vacancies';
import '../../workers.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My vacancies | TLGB' };

export default async function AgencyVacancies({ searchParams }: { searchParams: Promise<{ edit?: string; new?: string; error?: string; saved?: string; posted?: string; closed?: string; reopened?: string }> }) {
  const sp = await searchParams;
  const email = await getSessionEmail();
  if (!email) redirect('/login?next=/recruiter/vacancies');
  const agency = await agencyByEmail(email);
  if (!agency) redirect('/recruiter');
  if (agency.status !== 'approved') redirect('/recruiter');

  const { data } = await db().from('vacancies').select('*').eq('agency_id', agency.id).neq('status', 'removed').order('created_at', { ascending: false });
  const rows = (data ?? []) as Vacancy[];
  const balance = await creditBalance(agency.id);
  const editing = sp.edit ? rows.find((r) => r.id === sp.edit) ?? null : null;
  const showForm = !!editing || (sp.new === '1' && balance > 0);
  const v = editing;

  const statusText = (r: Vacancy) =>
    r.status === 'pending' ? 'Waiting for our check'
    : r.status === 'rejected' ? `Not approved${r.rejection_reason ? `: ${r.rejection_reason}` : ''}`
    : vacancyLive(r) ? `Live until ${ukDate(r.expires_at.slice(0, 10))}`
    : r.status === 'closed' ? 'Closed' : 'Ended';

  return (
    <div>
      <p className="small"><Link href="/recruiter">Back to my dashboard</Link></p>
      <h1>My vacancies</h1>
      <p className="lead">Vacancies show on the public <Link href="/recruitment">Recruitment</Link> page for {VACANCY_LIVE_DAYS} days once we have checked them. Job seekers whose profile matches get an email the day it goes live.</p>
      {sp.posted && <p className="ok-box">Thanks. Your vacancy is with us for checking, within 48 hours.</p>}
      {sp.saved && <p className="ok-box">Saved. It has gone back to us for checking.</p>}
      {sp.closed && <p className="ok-box">Closed. It no longer shows on the Recruitment page.</p>}
      {sp.reopened && <p className="ok-box">Sent for checking. It goes live again for {VACANCY_LIVE_DAYS} days once approved.</p>}
      {sp.error && <p className="err big">{sp.error.slice(0, 300)}</p>}

      <div className="wk-status">
        <p><strong>{balance}</strong> {balance === 1 ? 'credit' : 'credits'} left.</p>
        {balance > 0 && !showForm && <Link href="/recruiter/vacancies?new=1#form" className="wk-btn go">Post a vacancy</Link>}
        {balance <= 0 && <Link href="/recruiter" className="wk-btn">Get more credits</Link>}
      </div>

      {rows.length > 0 && (
        <div className="wk-list" style={{ marginBottom: 24 }}>
          {rows.map((r) => {
            const live = vacancyLive(r);
            return (
              <div key={r.id} className="wk-card">
                <h2>{r.title}{r.client_name ? ` (${r.client_name})` : ''}</h2>
                <div className="wk-meta">
                  <span><b>{statusText(r)}</b></span>
                  <span>{r.area ?? r.postcode}</span>
                  {payText(r) && <span>{payText(r)}</span>}
                  <span>{r.view_count} {r.view_count === 1 ? 'view' : 'views'}</span>
                </div>
                <div className="wk-actions" style={{ marginTop: 8 }}>
                  {live && <Link href={`/recruitment/vacancies/${r.id}`} className="small">View</Link>}
                  <Link href={`/recruiter/vacancies?edit=${r.id}#form`} className="small">Edit</Link>
                  {(live || r.status === 'closed') && (
                    <form method="post" action="/api/agency/vacancy" style={{ margin: 0 }}>
                      <input type="hidden" name="vacancy_id" value={r.id} />
                      <input type="hidden" name="action" value={live ? 'close' : 'reopen'} />
                      <button type="submit" className="linkish small">{live ? 'Close (filled or no longer needed)' : 'Run again (uses 1 credit)'}</button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <form method="post" action="/api/agency/vacancy" className="wk-form" id="form">
          <input type="hidden" name="action" value="save" />
          {v && <input type="hidden" name="vacancy_id" value={v.id} />}
          <h2 style={{ margin: 0 }}>{v ? 'Edit vacancy' : 'Post a vacancy'}</h2>

          <div className="wk-section">
            <h2>The job</h2>
            <label>Client <span className="hint">Optional. The employer you are recruiting for.</span><input type="text" name="client_name" maxLength={120} defaultValue={v?.client_name ?? ''} /></label>
            <label>Job title<input type="text" name="title" required maxLength={100} defaultValue={v?.title ?? ''} placeholder="For example: Landscape operative" /></label>
            <div className="row" style={{ marginTop: 12 }}>
              <label>Role<Pick name="level" opts={LEVELS} value={v?.level ?? null} empty="Any role" /></label>
              <label>Start date <span className="hint">Leave blank for as soon as possible.</span><input type="date" name="start_date" defaultValue={v?.start_date ?? ''} /></label>
            </div>
            <label style={{ marginTop: 12 }}>About the job <span className="hint">What the work is, hours, where the sites are, what you offer.</span>
              <textarea name="description" required maxLength={4000} defaultValue={v?.description ?? ''} style={{ minHeight: 140 }} /></label>
          </div>

          <div className="wk-section">
            <h2>Where and pay</h2>
            <div className="row">
              <label>Postcode the job is based from <span className="hint">The public only sees the first half, for example SG1.</span><input type="text" name="postcode" required maxLength={10} defaultValue={v?.postcode ?? ''} /></label>
              <label>Pay from (£)<input type="text" inputMode="decimal" name="pay_min" defaultValue={v?.pay_min ?? ''} /></label>
              <label>Pay up to (£)<input type="text" inputMode="decimal" name="pay_max" defaultValue={v?.pay_max ?? ''} /></label>
              <label>Per<Pick name="pay_period" opts={PAY_PERIODS} value={v?.pay_period ?? null} empty="Choose" /></label>
            </div>
            <div className="wk-ticks" style={{ marginTop: 12 }}>
              <div className="wk-sub">Type of work</div>
              <Ticks name="work_types" opts={WORK_TYPES} chosen={v?.work_types ?? []} />
            </div>
            <label className="chk" style={{ marginTop: 8 }}><input type="checkbox" name="own_vehicle" value="yes" defaultChecked={v?.own_vehicle ?? false} /> They need their own vehicle</label>
          </div>

          <div className="wk-section">
            <h2>Skills you need</h2>
            <p className="muted small" style={{ marginTop: 0 }}>We email job seekers who have at least one of these skills. Leave them all blank to reach everyone nearby in the role.</p>
            <div className="wk-ticks">
              {SKILL_GROUPS.map((g) => (
                <div key={g.group} style={{ display: 'contents' }}>
                  <div className="wk-sub">{g.group}</div>
                  <Ticks name="skills" opts={g.items} chosen={v?.skills ?? []} />
                </div>
              ))}
            </div>
          </div>

          <div className="wk-section">
            <h2>Cards and tickets they must have</h2>
            <p className="muted small" style={{ marginTop: 0 }}>Only tick what is essential. We only email people who hold all of the ones you tick.</p>
            <div className="wk-ticks">
              {QUAL_GROUPS.filter((g) => g !== 'Other').map((g) => (
                <div key={g} style={{ display: 'contents' }}>
                  <div className="wk-sub">{g}</div>
                  <Ticks name="cards" opts={QUAL_TYPES.filter((q) => q.group === g)} chosen={v?.cards ?? []} />
                </div>
              ))}
            </div>
          </div>

          <div className="wk-section">
            <h2>How to apply</h2>
            <p className="muted small" style={{ marginTop: 0 }}>These are shown to everyone who views the vacancy. Give at least one.</p>
            <div className="row">
              <label>Email<input type="email" name="apply_email" maxLength={200} defaultValue={v ? (v.apply_email ?? '') : agency.email} /></label>
              <label>Phone<input type="tel" name="apply_phone" maxLength={20} defaultValue={v?.apply_phone ?? ''} /></label>
              <label>Or a link to apply<input type="url" name="apply_url" maxLength={300} defaultValue={v?.apply_url ?? ''} placeholder="https://" /></label>
            </div>
          </div>

          <div className="wk-actions">
            <button type="submit" className="wk-btn go">{v ? 'Save changes' : 'Post vacancy'}</button>
            <Link href="/recruiter/vacancies" className="small">Cancel</Link>
          </div>
          {!v && <p className="muted small" style={{ margin: 0 }}>This uses 1 credit, returned if we cannot approve the vacancy. We check every vacancy before it goes live. Editing a vacancy sends it for checking again, with no extra credit.</p>}
        </form>
      )}
    </div>
  );
}
