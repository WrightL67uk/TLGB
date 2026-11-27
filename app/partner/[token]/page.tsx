import { notFound } from 'next/navigation';
import { db } from '@/lib/supabase';
import { siteUrl } from '@/lib/config';
import { pounds, type Commission, type Partner } from '@/lib/partners';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your partner dashboard | TLGB', robots: { index: false, follow: false } };

const ukDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const label = (sub: string | null) =>
  sub === 'active' ? 'Paying' : sub === 'trialing' ? 'On free trial' : sub === 'past_due' ? 'Payment problem' : sub === 'cancelled' ? 'Ended' : 'Signed up';

/** A partner's private dashboard. The long address is the key, so it is not indexed or linked from anywhere. */
export default async function PartnerDashboard({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{32}$/.test(token)) notFound();
  const { data } = await db().from('partners').select('*').eq('dashboard_token', token).maybeSingle();
  if (!data) notFound();
  const p = data as Partner;
  const [{ count: visits }, { data: referred }, { data: ledger }] = await Promise.all([
    db().from('partner_clicks').select('id', { count: 'exact', head: true }).eq('partner_id', p.id),
    db().from('businesses').select('id, trading_name, subscription_status, partner_at').eq('partner_id', p.id).order('partner_at', { ascending: false }).limit(500),
    db().from('partner_commissions').select('*').eq('partner_id', p.id).order('created_at', { ascending: false }).limit(500),
  ]);
  const members = referred ?? [];
  const rows = (ledger ?? []) as Commission[];
  const owed = rows.filter((c) => c.status === 'earned').reduce((s, c) => s + c.amount_pence, 0);
  const paidOut = rows.filter((c) => c.status === 'paid').reduce((s, c) => s + c.amount_pence, 0);
  const link = `${siteUrl()}/p/${p.code}`;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <h1>Partner dashboard: {p.name}</h1>
      {p.status === 'suspended' && <p className="err big">This partner account is switched off. Your link no longer tracks new sign-ups. Email admin@tlgb.co.uk with any questions.</p>}
      <div className="panel">
        <p style={{ marginTop: 0 }}>Your link, to share with trades: <strong>{link}</strong></p>
        <p className="small" style={{ marginBottom: 0 }}>
          Your code is <strong>{p.code}</strong>. Trades can also type it on the sign-up page. You earn {pounds(p.monthly_pence)} for each paid
          monthly payment and {pounds(p.yearly_pence)} for each paid yearly payment, for as long as the member keeps paying. Nothing is earned during
          the free trial.
        </p>
      </div>
      <p>
        {visits ?? 0} visit{visits === 1 ? '' : 's'} to your link · {members.length} sign-up{members.length === 1 ? '' : 's'} ·{' '}
        {members.filter((m) => m.subscription_status === 'active').length} paying now
      </p>
      <p><strong>{pounds(owed)}</strong> owed to you · {pounds(paidOut)} paid so far. Payments are made monthly by bank transfer once you are owed £25 or more.</p>

      <h2>Members you introduced</h2>
      {!members.length && <p className="muted">Nobody has signed up through your link yet.</p>}
      {members.length > 0 && (
        <table className="table">
          <thead><tr><th>Business</th><th>Signed up</th><th>Status</th></tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}><td>{m.trading_name}</td><td>{m.partner_at ? ukDate(m.partner_at) : ''}</td><td>{label(m.subscription_status)}</td></tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Your commission</h2>
      {!rows.length && <p className="muted">No commission yet. It starts when a member you introduced makes their first payment after the free trial.</p>}
      {rows.length > 0 && (
        <table className="table">
          <thead><tr><th>Date</th><th>Member</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>{ukDate(c.created_at)}</td>
                <td>{c.business_name ?? 'Member'}</td>
                <td>{pounds(c.amount_pence)}</td>
                <td>{c.status === 'paid' && c.paid_at ? `Paid ${ukDate(c.paid_at)}` : c.status === 'earned' ? 'Owed to you' : 'Reversed (refund)'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
