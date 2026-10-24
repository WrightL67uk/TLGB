import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/supabase';
import { packOwner } from '@/lib/compliance';
import { cleanJob, cleanApp, appStatus, datesFor, retentionFor, sumDue } from '@/lib/payments';
import { money, todayUK, ukDay, lateInterest } from '@/lib/payDates';
import TermsFields from '../TermsFields';
import '../../../../pay.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Job payments | TLGB' };

const short = (s: string | null) => (s ? new Date(`${s}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '');

function Act({ fields, label, cls, confirm }: { fields: Record<string, string>; label: string; cls?: string; confirm?: boolean }) {
  return (
    <form method="post" action="/api/payments">
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {confirm && <label className="small" style={{ marginRight: 6 }}><input type="checkbox" name="confirm" value="1" required /> I&rsquo;m sure</label>}
      <button type="submit" className={`pay-btn ${cls ?? ''}`}>{label}</button>
    </form>
  );
}

export default async function PayJobPage({ params, searchParams }: { params: Promise<{ id: string; jobId: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { id, jobId } = await params;
  const sp = await searchParams;
  const own = await packOwner(id);
  if (!own.ok) {
    if (own.status === 401) redirect(`/login?next=/account/${id}/payments/${jobId}`);
    redirect(`/account/${id}/payments`);
  }
  const b = own.business;
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) notFound();
  const { data: row } = await db().from('pay_jobs').select('*').eq('id', jobId).eq('business_id', b.id).maybeSingle();
  if (!row) notFound();
  const j = cleanJob(row);
  const { data: appRows } = await db().from('pay_apps').select('*').eq('job_id', j.id).order('number', { ascending: false });
  const apps = (appRows ?? []).map(cleanApp);
  const today = todayUK();
  const ret = retentionFor(j, apps, today);
  const base = { business_id: b.id, job_id: j.id };
  const baseRate = Number(process.env.LATE_PAYMENT_BASE_RATE || 3.75);
  const nextNo = (apps[0]?.number ?? 0) + 1;
  const doc = (kind: string, ref: string) => `/api/payments/doc?b=${b.id}&kind=${kind}&id=${ref}`;

  return (
    <div className="narrow" style={{ maxWidth: 980 }}>
      <p className="small"><Link href={`/account/${b.id}/payments`}>Payment tracker</Link></p>
      <h1>{j.name}</h1>
      <div className="pay-meta" style={{ marginBottom: 10 }}>
        <span><b>{j.contractor}</b></span>
        {j.contract_ref && <span>Ref. {j.contract_ref}</span>}
        {j.contract_sum != null && <span>Subcontract {money(j.contract_sum)}</span>}
        <span>{j.terms === 'scheme' ? 'Scheme terms: due 7 days after period end, final date 17 days later' : `Due ${j.due_days} days after application, final date ${j.final_days} days after due date`}</span>
        {j.archived_at && <span className="pay-tag">Finished</span>}
      </div>
      {sp.error && <p className="err big">{sp.error}</p>}
      {sp.saved && <p className="ok-box">Saved.</p>}

      <section className="pay-box">
        <h2>Applications</h2>
        {!apps.length && <p className="muted">No applications yet. Add your first one below and we will work out every date.</p>}
        {apps.length > 0 && (
          <div className="pay-wrap">
            <table className="pay-table">
              <thead><tr><th>#</th><th>Applied</th><th>Amount</th><th>Payment notice by</th><th>Pay less by</th><th>Final date</th><th>Status</th></tr></thead>
              <tbody>
                {apps.map((a) => {
                  const d = datesFor(j, a);
                  const s = appStatus(j, a, today);
                  return (
                    <tr key={a.id}>
                      <td>{a.number}</td>
                      <td>{short(a.applied_on)}</td>
                      <td>{money(a.amount_applied)}{sumDue(a) !== a.amount_applied && <><br /><span className="muted small">due {money(sumDue(a))}</span></>}</td>
                      <td>{short(d.paymentNoticeBy)}{a.payment_notice_on && <><br /><span className="muted small">got {short(a.payment_notice_on)}</span></>}</td>
                      <td>{short(d.paylessBy)}{a.payless_on && <><br /><span className="muted small">got {short(a.payless_on)}</span></>}</td>
                      <td>{short(d.finalDate)}</td>
                      <td><span className={`pay-tag ${s.tone === 'neutral' ? '' : s.tone}`}>{s.label}</span>{a.paid_on && <><br /><span className="muted small">{money(a.amount_paid)} on {short(a.paid_on)}</span></>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {apps.map((a) => {
          const d = datesFor(j, a);
          const s = appStatus(j, a, today);
          const pnMissed = !a.payment_notice_on && today > d.paymentNoticeBy;
          const late = s.overdue && s.outstanding > 0;
          const li = late ? lateInterest(s.outstanding, d.suspendNoticeFrom, today, baseRate) : null;
          return (
            <details key={a.id} className="pay-edit" open={(pnMissed || late) && !a.paid_on}>
              <summary>Application {a.number}: {s.label}{s.next ? `, ${s.next.what.toLowerCase()} ${ukDay(s.next.date)}` : ''}</summary>
              {pnMissed && !a.paid_on && (
                <p className="warn">No payment notice was recorded by {ukDay(d.paymentNoticeBy)}. If your application was made in line with the subcontract, the {money(a.amount_applied)} you applied for is now the sum due, and only a valid pay less notice by {ukDay(d.paylessBy)} can reduce it. If not, send your own notice of the sum due. <a href={doc('default-notice', a.id)}>Download it</a>.</p>
              )}
              {late && li && (
                <p className="warn">Unpaid since the final date ({ukDay(d.finalDate)}). You can give 7 days&rsquo; notice of your intention to suspend, and claim late payment interest: {money(li.interest)} so far ({li.days} days at {li.rate}%, {money(li.daily)} a day) plus {money(li.compensation)} fixed compensation.</p>
              )}
              <div className="pay-actions" style={{ margin: '8px 0' }}>
                <a className="pay-btn" href={doc('application', a.id)}>Application letter</a>
                {pnMissed && <a className="pay-btn" href={doc('default-notice', a.id)}>Notice of sum due</a>}
                {late && <a className="pay-btn go" href={doc('suspension', a.id)}>Notice of intention to suspend</a>}
                {(late || (a.paid_on && a.paid_on > d.finalDate)) && <a className="pay-btn" href={doc('interest', a.id)}>Late payment interest claim</a>}
              </div>
              <form method="post" action="/api/payments" className="grid">
                <input type="hidden" name="action" value="app-update" />
                {Object.entries(base).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
                <input type="hidden" name="app_id" value={a.id} />
                <div className="row">
                  <label>Payment notice received<input type="date" name="payment_notice_on" defaultValue={a.payment_notice_on ?? ''} /></label>
                  <label>Amount in their notice £<input name="amount_notified" inputMode="decimal" defaultValue={a.amount_notified ?? ''} /></label>
                  <label>Pay less notice received<input type="date" name="payless_on" defaultValue={a.payless_on ?? ''} /></label>
                  <label>Pay less amount £<input name="amount_payless" inputMode="decimal" defaultValue={a.amount_payless ?? ''} /></label>
                </div>
                <div className="row">
                  <label>Paid on<input type="date" name="paid_on" defaultValue={a.paid_on ?? ''} /></label>
                  <label>Amount paid £<input name="amount_paid" inputMode="decimal" defaultValue={a.amount_paid ?? ''} /></label>
                  <label>Gross valuation to date £<input name="gross_to_date" inputMode="decimal" defaultValue={a.gross_to_date ?? ''} /></label>
                  <label>Amount applied £<input name="amount_applied" inputMode="decimal" required defaultValue={a.amount_applied} /></label>
                </div>
                <div className="row">
                  <label>Applied on<input type="date" name="applied_on" required defaultValue={a.applied_on} /></label>
                  {j.terms === 'scheme' && <label>Period end<input type="date" name="period_end" defaultValue={a.period_end ?? ''} /></label>}
                  <label>Notes<input name="notes" maxLength={500} defaultValue={a.notes ?? ''} /></label>
                </div>
                <div className="pay-actions"><button type="submit" className="pay-btn go">Save</button></div>
              </form>
              <div className="pay-actions" style={{ marginTop: 6 }}>
                <Act fields={{ action: 'app-delete', ...base, app_id: a.id }} label="Delete this application" confirm />
              </div>
            </details>
          );
        })}

        <details className="pay-edit" open={!apps.length} style={{ marginTop: 12 }}>
          <summary>Add application {nextNo}</summary>
          <form method="post" action="/api/payments" className="grid" style={{ marginTop: 8 }}>
            <input type="hidden" name="action" value="app-create" />
            {Object.entries(base).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            <div className="row">
              <label>Application number<input type="number" name="number" min={1} max={999} defaultValue={nextNo} required /></label>
              <label>Date applied<input type="date" name="applied_on" defaultValue={today} required /></label>
              {j.terms === 'scheme' && <label>End of the payment period<input type="date" name="period_end" defaultValue={today} /></label>}
            </div>
            <div className="row">
              <label>Gross valuation to date £<input name="gross_to_date" inputMode="decimal" placeholder="for retention" /></label>
              <label>Amount applied for this time £<input name="amount_applied" inputMode="decimal" required /></label>
            </div>
            <div className="pay-actions"><button type="submit" className="pay-btn go">Add application</button></div>
          </form>
        </details>
      </section>

      {ret && (
        <section className="pay-box">
          <h2>Retention</h2>
          <div className="pay-meta">
            <span>Held <b>{money(ret.held)}</b> ({j.retention_override != null ? 'entered by you' : `${j.retention_pct}% of latest gross valuation`})</span>
            <span className={`pay-tag ${ret.status.tone === 'neutral' ? '' : ret.status.tone}`}>{ret.status.label}</span>
          </div>
          <table className="pay-table" style={{ marginTop: 8 }}>
            <thead><tr><th></th><th>Amount</th><th>Due</th><th>Released</th></tr></thead>
            <tbody>
              <tr><td>At practical completion ({j.first_release_pct}%)</td><td>{money(ret.firstAmount)}</td><td>{ret.firstDue ? ukDay(ret.firstDue) : 'Set the practical completion date'}</td><td>{j.first_released_on ? `${money(j.first_released_amount ?? ret.firstAmount)} on ${short(j.first_released_on)}` : ''}</td></tr>
              <tr><td>End of defects period ({j.dlp_months} months)</td><td>{money(ret.secondAmount)}</td><td>{ret.secondDue ? ukDay(ret.secondDue) : ''}</td><td>{j.second_released_on ? `${money(j.second_released_amount ?? ret.secondAmount)} on ${short(j.second_released_on)}` : ''}</td></tr>
            </tbody>
          </table>
          <div className="pay-actions" style={{ margin: '10px 0' }}>
            <a className="pay-btn" href={doc('retention', j.id)}>Retention release request letter</a>
          </div>
          <details className="pay-edit">
            <summary>Record a retention release</summary>
            <form method="post" action="/api/payments" className="grid" style={{ marginTop: 8 }}>
              <input type="hidden" name="action" value="retention" />
              {Object.entries(base).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
              <div className="row">
                <label>First half released on<input type="date" name="first_released_on" defaultValue={j.first_released_on ?? ''} /></label>
                <label>Amount £<input name="first_released_amount" inputMode="decimal" defaultValue={j.first_released_amount ?? ''} /></label>
                <label>Second half released on<input type="date" name="second_released_on" defaultValue={j.second_released_on ?? ''} /></label>
                <label>Amount £<input name="second_released_amount" inputMode="decimal" defaultValue={j.second_released_amount ?? ''} /></label>
              </div>
              <div className="pay-actions"><button type="submit" className="pay-btn go">Save</button></div>
            </form>
          </details>
        </section>
      )}

      <section className="pay-box">
        <details className="pay-edit">
          <summary>Edit job details, payment terms and retention</summary>
          <form method="post" action="/api/payments" className="grid" style={{ marginTop: 10 }}>
            <input type="hidden" name="action" value="job-save" />
            {Object.entries(base).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            <TermsFields j={j} />
            <button type="submit" className="pay-btn go">Save changes</button>
          </form>
        </details>
        <div className="pay-actions" style={{ marginTop: 12 }}>
          <Act fields={{ action: j.archived_at ? 'job-unarchive' : 'job-archive', ...base }} label={j.archived_at ? 'Move back to current jobs' : 'Mark job as finished'} />
          <Act fields={{ action: 'job-delete', ...base }} label="Delete job and its applications" confirm />
        </div>
      </section>
      <p className="muted small">Dates follow the Construction Act and the Scheme for Construction Contracts (England and Wales), leaving out Christmas Day, Good Friday and bank holidays where set. Late payment interest uses a base rate of {baseRate}%; check the Bank of England reference rate for the half year the debt became overdue. Guidance only, not legal advice.</p>
    </div>
  );
}
