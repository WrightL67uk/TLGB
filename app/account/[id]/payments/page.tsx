import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/supabase';
import { ownedBusiness } from '@/lib/account';
import { isPaid } from '@/lib/membership';
import { cleanJob, cleanApp, appStatus, retentionFor, type PayApp } from '@/lib/payments';
import { money, todayUK, ukDay } from '@/lib/payDates';
import TermsFields from './TermsFields';
import '../../../pay.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Payment tracker | TLGB' };

export default async function PaymentTracker({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; archived?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const own = await ownedBusiness(id);
  if (!own.ok) {
    if (own.status === 401) redirect(`/login?next=/account/${id}/payments`);
    notFound();
  }
  const b = own.business;
  if (!isPaid(b)) {
    return (
      <div className="narrow">
        <p className="small"><Link href={`/account/${b.id}`}>Back to my listing</Link></p>
        <h1>Payment tracker</h1>
        <p className="lead">Track every application, get warned before payment notice and final date deadlines, chase retentions and send the right notice in one click.</p>
        <div className="panel"><p>The payment tracker is included with every paid membership. Anyone can use the <Link href="/tools/payment-dates">free payment dates calculator</Link>.</p></div>
      </div>
    );
  }

  const showArchived = sp.archived === '1';
  let q = db().from('pay_jobs').select('*').eq('business_id', b.id).order('created_at', { ascending: false });
  q = showArchived ? q.not('archived_at', 'is', null) : q.is('archived_at', null);
  const { data: jobRows } = await q;
  const jobs = (jobRows ?? []).map(cleanJob);
  const { data: appRows } = jobs.length ? await db().from('pay_apps').select('*').in('job_id', jobs.map((j) => j.id)) : { data: [] };
  const apps = (appRows ?? []).map(cleanApp);
  const today = todayUK();

  let outstanding = 0; let overdue = 0; let retHeld = 0; let retDue = 0; let alerts = 0;
  const cards = jobs.map((j) => {
    const mine = apps.filter((a) => a.job_id === j.id).sort((x, y) => y.number - x.number);
    const st = mine.map((a) => ({ a, s: appStatus(j, a, today) }));
    const out = st.reduce((n, x) => n + x.s.outstanding, 0);
    const late = st.filter((x) => x.s.overdue && x.s.outstanding > 0).reduce((n, x) => n + x.s.outstanding, 0);
    const ret = retentionFor(j, mine, today);
    outstanding += out; overdue += late;
    if (ret) { retHeld += ret.firstOutstanding + ret.secondOutstanding; if (ret.status.tone === 'warn' || ret.status.tone === 'bad') retDue += (ret.firstDue && !j.first_released_on && today >= ret.firstDue ? ret.firstOutstanding : 0) + (ret.secondDue && !j.second_released_on && today >= ret.secondDue ? ret.secondOutstanding : 0); }
    const next = st.map((x) => x.s.next).filter(Boolean).sort((x, y) => (x!.date < y!.date ? -1 : 1))[0] ?? null;
    const worst = st.some((x) => x.s.tone === 'bad') || ret?.status.tone === 'bad' ? 'alert' : st.some((x) => x.s.tone === 'warn') || ret?.status.tone === 'warn' ? 'warn' : '';
    if (worst) alerts++;
    return { j, mine: mine as PayApp[], st, out, late, ret, next, worst };
  });

  return (
    <div className="narrow" style={{ maxWidth: 900 }}>
      <p className="small"><Link href={`/account/${b.id}`}>Back to my listing</Link> · <Link href="/tools/payment-dates">Payment dates calculator</Link></p>
      <h1>Payment tracker</h1>
      <p className="lead">Your jobs, applications and retentions in one place. We work out every deadline from each job&rsquo;s terms and email you when a payment notice is missed, a payment is late or a retention is due.</p>
      {sp.error && <p className="err big">{sp.error}</p>}

      <div className="pay-stats">
        <div className="pay-stat"><b>{money(outstanding) || '£0.00'}</b><span>waiting to be paid</span></div>
        <div className={`pay-stat${overdue > 0 ? ' bad' : ''}`}><b>{money(overdue) || '£0.00'}</b><span>overdue</span></div>
        <div className="pay-stat"><b>{money(retHeld) || '£0.00'}</b><span>retention held</span></div>
        <div className={`pay-stat${retDue > 0 ? ' bad' : ''}`}><b>{money(retDue) || '£0.00'}</b><span>retention due now</span></div>
      </div>

      <div className="pay-actions" style={{ marginBottom: 12 }}>
        <Link href={showArchived ? `/account/${b.id}/payments` : `/account/${b.id}/payments?archived=1`} className="pay-btn">{showArchived ? 'Show current jobs' : 'Show finished jobs'}</Link>
        {alerts > 0 && <span className="pay-tag bad">{alerts} job{alerts === 1 ? '' : 's'} need attention</span>}
      </div>

      <div className="pay-jobs">
        {!cards.length && <p className="muted">{showArchived ? 'No finished jobs.' : 'No jobs yet. Add your first one below.'}</p>}
        {cards.map(({ j, mine, st, out, late, ret, next, worst }) => (
          <Link key={j.id} href={`/account/${b.id}/payments/${j.id}`} className={`pay-card ${worst}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <h3>{j.name}</h3>
            <div className="pay-meta">
              <span><b>{j.contractor}</b></span>
              <span>{mine.length} application{mine.length === 1 ? '' : 's'}</span>
              {out > 0 && <span>Outstanding <b>{money(out)}</b></span>}
              {late > 0 && <span className="pay-tag bad">{money(late)} overdue</span>}
              {st.some((x) => x.s.label === 'No payment notice') && <span className="pay-tag warn">Payment notice missed</span>}
              {ret && ret.status.tone !== 'neutral' && ret.status.tone !== 'ok' && <span className={`pay-tag ${ret.status.tone}`}>{ret.status.label}</span>}
              {next && <span>Next: {next.what} {ukDay(next.date)}</span>}
            </div>
          </Link>
        ))}
      </div>

      {!showArchived && (
        <section className="pay-box" style={{ marginTop: 20 }}>
          <details className="pay-edit" open={!cards.length}>
            <summary>Add a job</summary>
            <form method="post" action="/api/payments" className="grid" style={{ marginTop: 10 }}>
              <input type="hidden" name="action" value="job-save" />
              <input type="hidden" name="business_id" value={b.id} />
              <TermsFields />
              <button type="submit" className="pay-btn go">Add job</button>
            </form>
          </details>
        </section>
      )}
      <p className="muted small">Dates follow the Construction Act and the Scheme for Construction Contracts (England and Wales). This is guidance, not legal advice: always check your subcontract.</p>
    </div>
  );
}
