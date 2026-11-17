import AgencyExplainer from '../agencies/Explainer';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionEmail } from '@/lib/session';
import { agencyByEmail, creditBalance, getAgencyPlan, referralLink, referralStats, settleReferralCredits } from '@/lib/agencies';
import { stripeEnabled } from '@/lib/stripe';
import '../resources.css';
import '../workers.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Recruiter dashboard | TLGB' };

export default async function Recruiter({ searchParams }: { searchParams: Promise<{ paid?: string; billing?: string }> }) {
  const sp = await searchParams;
  const email = await getSessionEmail();
  if (!email) redirect('/login?next=/recruiter');
  const agency = await agencyByEmail(email);
  if (!agency) {
    return (
      <div className="narrow">
        <h1>Recruitment agencies</h1>
        <p className="lead">This login is not a recruitment agency account.</p>
        <p><Link href="/agencies/join" className="sq sq-rust">Create an agency account</Link></p>
      </div>
    );
  }
  const approved = agency.status === 'approved';
  if (approved) await settleReferralCredits(agency).catch(() => null);
  const [plan, balance, refs] = await Promise.all([getAgencyPlan(), creditBalance(agency.id), referralStats(agency)]);
  const subscribed = ['active', 'trialing', 'past_due'].includes(agency.subscription_status);
  const link = referralLink(agency.referral_code);

  return (
    <div className="narrow">
      <h1>{agency.name}</h1>
      {sp.paid && <p className="ok-box">Thanks. Your credits arrive as soon as the payment is confirmed, usually within a minute.</p>}
      {sp.billing && <p className="err big">{sp.billing}</p>}
      {agency.status === 'pending' && <p className="warn"><strong>We are checking your agency.</strong> This usually takes one working day. You will get an email when you are approved.</p>}
      {agency.status === 'suspended' && <p className="err big">This account is suspended. Contact admin@tlgb.co.uk.</p>}

      {approved && (
        <>
          <section className="panel">
            <h2>Vacancy credits: {balance}</h2>
            <p>One credit puts one vacancy live for 60 days. Every vacancy is checked by us before it shows, usually within one working day, and the credit comes back if we cannot approve it.</p>
            <p><Link href="/recruiter/vacancies?new=1#form" className="sq sq-rust">Post a vacancy</Link> <Link href="/recruiter/vacancies" style={{ marginLeft: 12 }}>My vacancies</Link> <Link href="/recruitment?tab=people" style={{ marginLeft: 12 }}>Search people looking for work</Link></p>
          </section>

          <section className="panel">
            <h2>Get free credits</h2>
            <p>Share your own link with candidates. Every {refs.per} who join through it and publish a profile earns you one credit.</p>
            <p><input readOnly value={link} style={{ width: '100%' }} aria-label="Your link" /></p>
            <p className="muted small">{refs.total} job seekers so far. {refs.toNext} more for your next credit. Your own staff do not count.</p>
          </section>

          <AgencyExplainer plan={plan} compact />

          <section className="panel">
            <h2>Monthly plan</h2>
            {subscribed ? (
              <>
                <p>Your plan is active: {plan.credits} credits every month, and unused credits roll over.</p>
                <form method="post" action="/api/agency/portal"><button type="submit">Manage billing</button></form>
              </>
            ) : (
              <>
                <p>£{plan.price} a month for {plan.credits} credits. Unused credits roll over, so a busy season is covered. Cancel any time.</p>
                {stripeEnabled()
                  ? <form method="post" action="/api/agency/checkout"><button type="submit" className="primary">Start the plan</button></form>
                  : <p className="muted">Online payment is not switched on yet.</p>}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
