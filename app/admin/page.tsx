import Link from 'next/link';
import { db } from '@/lib/supabase';
import { expiryItems, daysUntil, fmtDate, type Expiries } from '@/lib/expiries';
import { getTakings, VAT_THRESHOLD, VAT_REVIEW_AT, VAT_WARN_AT, type Takings } from '@/lib/takings';

export const dynamic = 'force-dynamic';

const gbp0 = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`;

/** Takings over the last 12 months against the VAT registration threshold. */
function VatWatch({ t }: { t: Takings | 'error' }) {
  if (t === null) return null;
  if (t === 'error') return <p className="muted small">VAT watch: could not read takings from Stripe just now.</p>;
  const pct = Math.min(100, (t.year / VAT_THRESHOLD) * 100);
  const level = t.year >= VAT_WARN_AT || t.month >= VAT_THRESHOLD ? 'red' : t.year >= VAT_REVIEW_AT ? 'amber' : 'green';
  const colour = level === 'red' ? 'var(--danger)' : level === 'amber' ? 'var(--warn, #b54708)' : 'var(--accent, #2f6b2a)';
  return (
    <div className="panel vat-watch" style={{ borderColor: colour }}>
      <div className="vat-row">
        <strong>VAT watch</strong>
        <span>
          Takings in the last 12 months: <b>{gbp0(t.year)}</b> of {gbp0(VAT_THRESHOLD)} ({Math.round(pct)}%)
          <span className="muted small"> · last 30 days {gbp0(t.month)}</span>
        </span>
      </div>
      <div className="vat-bar"><span style={{ width: `${pct}%`, background: colour }} /></div>
      {level === 'amber' && <p className="small" style={{ color: colour, margin: '6px 0 0' }}>Halfway to the VAT threshold. Time to review registering with your accountant.</p>}
      {level === 'red' && (
        <p className="small" style={{ color: colour, margin: '6px 0 0' }}>
          {t.year >= VAT_THRESHOLD
            ? 'Over the VAT threshold. You must register with HMRC within 30 days of the end of the month you went over, and give members 30 days’ notice.'
            : 'Close to the VAT threshold. Register now so members get their 30 days’ notice in time.'}
        </p>
      )}
      <p className="muted small" style={{ margin: '4px 0 0' }}>Card payments through Stripe, less refunds. Updated hourly. Amber at {gbp0(VAT_REVIEW_AT)}, red at {gbp0(VAT_WARN_AT)}.</p>
    </div>
  );
}

const TABS = [
  { key: 'pending_review', label: 'Awaiting approval' },
  { key: 'started', label: 'Signed up, details not sent' },
  { key: 'recheck', label: 'Changes to check' },
  { key: 'expiring', label: 'Expiring or expired' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'suspended', label: 'Suspended' },
];

export default async function AdminQueue({ searchParams }: { searchParams: Promise<{ status?: string; leads?: string; deleted?: string; delete_error?: string }> }) {
  const sp = await searchParams;
  const { status: s, leads: leadsMsg } = sp;
  const status = TABS.some((t) => t.key === s) ? s! : 'pending_review';

  // Approved listings with insurance or an accreditation due within 30 days, or already expired
  const { data: live } = await db()
    .from('businesses')
    .select('id, created_at, trading_name, business_type, company_number, base_postcode, email, pl_expiry, el_expiry, el_cover_amount, accreditations, accreditation_expiries')
    .eq('status', 'approved')
    .limit(2000);
  const expiring = (live ?? [])
    .map((b) => {
      const due = expiryItems({ ...b, accreditation_expiries: b.accreditation_expiries as Expiries })
        .map((i) => ({ ...i, days: daysUntil(i.expiry) }))
        .filter((i) => i.days <= 30)
        .sort((x, y) => x.days - y.days);
      return { ...b, due };
    })
    .filter((b) => b.due.length > 0)
    .sort((x, y) => x.due[0].days - y.due[0].days);

  // "recheck" is approved listings with changes waiting for a look; the rest are statuses
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scope = (q: any, key: string) =>
    key === 'recheck' ? q.eq('status', 'approved').eq('recheck_required', true) : q.eq('status', key === 'expiring' ? '__none__' : key);

  const [{ data: rows }, counts]: [{ data: { id: string; created_at: string; trading_name: string; business_type: string; company_number: string | null; base_postcode: string; email: string; pl_expiry: string | null }[] | null }, Record<string, number>] = await Promise.all([
    scope(
      db()
        .from('businesses')
        .select('id, created_at, trading_name, business_type, company_number, base_postcode, email, pl_expiry'),
      status
    )
      .order('created_at', { ascending: status === 'pending_review' || status === 'recheck' })
      .limit(200),
    Promise.all(
      TABS.map(async (t) => {
        const { count } = await scope(db().from('businesses').select('id', { count: 'exact', head: true }), t.key);
        return [t.key, t.key === 'expiring' ? expiring.length : count ?? 0] as const;
      })
    ).then((x) => Object.fromEntries(x)),
  ]);

  // New supplier submissions and unanswered enquiries, so they are visible from the main admin screen
  const [{ count: newSuppliers }, { count: newEnquiries }] = await Promise.all([
    db().from('suppliers').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    db().from('service_enquiries').select('id', { count: 'exact', head: true }).eq('handled', false),
  ]);
  const waiting = (newSuppliers ?? 0) + (newEnquiries ?? 0);
  const { count: contractorsWaiting = 0 } = await db().from('contractor_companies').select('id', { count: 'exact', head: true }).eq('status', 'pending');

  // Compliance pack certificates waiting for a check, grouped by listing
  const { data: packPending } = await db().from('compliance_docs').select('business_id, title').eq('status', 'pending').is('archived_at', null).limit(500);
  const packIds = [...new Set((packPending ?? []).map((d) => d.business_id as string))];
  const { data: packBiz } = packIds.length
    ? await db().from('businesses').select('id, trading_name').in('id', packIds)
    : { data: [] as { id: string; trading_name: string }[] };

  const takings = await getTakings();

  return (
    <div>
      <VatWatch t={takings} />
      <div className="admin-head">
        <h1>Admin</h1>
        {sp.deleted && <p className="ok-box">Deleted {sp.deleted}.</p>}
        {sp.delete_error && <p className="err big">{sp.delete_error}</p>}
        <form action="/api/admin/leads-import" method="post" className="inline">
          <input type="hidden" name="days" value="14" />
          <button type="submit">Fetch leads now (last 14 days)</button>
        </form>
        <Link href="/admin/contractors">
          Main contractors
          {(contractorsWaiting ?? 0) > 0 && <span className="count"> {contractorsWaiting} waiting</span>}
        </Link>
        <Link href="/admin/workers">Job seekers</Link>
        <Link href="/admin/waitlist">Waiting list</Link>
        <Link href="/admin/admins">Admins</Link>
        <Link href="/admin/codes">Discount codes</Link>
        <Link href="/admin/prices">Prices</Link>
        <Link href="/admin/resources">
          Suppliers, enquiries and Help Hub
          {waiting > 0 && <span className="count"> {waiting} waiting</span>}
        </Link>
      </div>
      {leadsMsg && <p className="ok-box">{leadsMsg}</p>}
      {packIds.length > 0 && (
        <div className="panel" style={{ borderColor: 'var(--warn)' }}>
          <strong>Compliance pack certificates to check: {packPending!.length}</strong>
          <ul className="docs">
            {(packBiz ?? []).map((b) => (
              <li key={b.id}><Link href={`/admin/${b.id}#pack`}>{b.trading_name}</Link>
                <span className="muted small"> {packPending!.filter((d) => d.business_id === b.id).map((d) => d.title).join(', ')}</span></li>
            ))}
          </ul>
        </div>
      )}
      <nav className="tabs">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin?status=${t.key}`} className={t.key === status ? 'on' : ''}>
            {t.label} <span className="count">{counts[t.key]}</span>
          </Link>
        ))}
      </nav>

      {status === 'expiring' ? (
        !expiring.length ? <p className="muted">Nothing due in the next 30 days.</p> : (
          <table className="table">
            <thead><tr><th>Business</th><th>Due</th></tr></thead>
            <tbody>
              {expiring.map((b) => (
                <tr key={b.id}>
                  <td><Link href={`/admin/${b.id}`}>{b.trading_name}</Link><br /><span className="muted small">{b.email}</span></td>
                  <td>{b.due.map((i) => (
                    <div key={i.key} className={i.days < 0 ? 'warn' : ''}>
                      {i.label}: {i.days < 0 ? `expired ${fmtDate(i.expiry)}` : `${fmtDate(i.expiry)} (${i.days} days)`}
                    </div>
                  ))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      ) : !rows?.length ? (
        <p className="muted">Nothing here.</p>
      ) : (
        <table className="table">
          <thead>
            <tr><th>Submitted</th><th>Business</th><th>Type</th><th>Postcode</th><th>PL expiry</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.created_at).toLocaleDateString('en-GB')}</td>
                <td><Link href={`/admin/${r.id}`}>{r.trading_name}</Link><br /><span className="muted small">{r.email}</span></td>
                <td>{r.business_type === 'ltd' ? `Ltd ${r.company_number}` : 'Sole trader'}</td>
                <td>{r.base_postcode}</td>
                <td>{r.pl_expiry ? new Date(r.pl_expiry).toLocaleDateString('en-GB') : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
