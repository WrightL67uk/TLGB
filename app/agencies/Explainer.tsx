import type { AgencyPlan } from '@/lib/agencies';

/** Plain explanation of what an agency gets, the process, and how credits work. Shown on sign-up and on the dashboard. */
export default function AgencyExplainer({ plan, compact = false }: { plan: AgencyPlan; compact?: boolean }) {
  return (
    <section className="panel" style={{ margin: '18px 0' }}>
      {!compact && (
        <>
          <h2 style={{ marginTop: 0 }}>What you get</h2>
          <ul>
            <li>Post vacancies for your clients on the Recruitment page, seen by tradespeople and job seekers across the UK.</li>
            <li>Search people looking for work and see their contact details once you are approved.</li>
            <li>Email alerts to matching job seekers when your vacancy goes live.</li>
            <li>Your own link to share with candidates. Every job seeker who joins through it earns you free credits.</li>
            <li>No contract. Free to sign up. You only pay if you choose the monthly plan.</li>
          </ul>
        </>
      )}
      <h2 style={compact ? { marginTop: 0 } : undefined}>How it works</h2>
      <ol>
        <li><b>Sign up free.</b> Tell us about your agency, your insurance and what you place.</li>
        <li><b>We check you.</b> We verify your company, website and insurance dates. Usually within one working day, and you get an email either way.</li>
        <li><b>Get credits.</b> Start the monthly plan, or earn free credits with your link (or both).</li>
        <li><b>Post a vacancy.</b> It costs 1 credit and goes to us for a quick check.</li>
        <li><b>It goes live.</b> Once approved it shows for 60 days and matching job seekers are emailed.</li>
      </ol>
      <h2>How credits work</h2>
      <ul>
        <li><b>1 credit = 1 vacancy live for 60 days.</b></li>
        <li><b>Monthly plan:</b> £{plan.price} a month for {plan.credits} credits. Unused credits roll over to the next month, so a quiet month covers a busy one. Cancel any time.</li>
        <li><b>Free credits:</b> every {plan.per_referral_credit} job seekers who join through your link and publish a profile earns you 1 credit, up to {plan.referral_cap} a month. Your own staff do not count.</li>
        <li><b>Not approved?</b> If we cannot approve a vacancy, the credit goes straight back to you, with the reason.</li>
        <li><b>Editing a live vacancy</b> is free, but it goes back to us for a quick re-check. Re-opening a closed one costs 1 credit.</li>
        <li>You can see your balance and every credit in and out on your dashboard.</li>
      </ul>
    </section>
  );
}
