import Link from 'next/link';
import { getContractor } from '@/lib/contractors';
import '../contractor.css';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'For main contractors | The Little Green Book',
  description: 'Free for main contractors: keep a shortlist of checked landscaping and external works subcontractors, and post work packages straight to the trades that match.',
};

export default async function ForContractors() {
  const me = await getContractor();
  return (
    <div className="ct-page">
      <section className="ct-hero">
        <h1>Free for main contractors</h1>
        <p>Find checked landscaping and external works subcontractors, keep your own shortlist, and post work packages straight to the trades who match.</p>
        {me
          ? <Link href="/contractor" className="sq sq-rust">Go to my dashboard</Link>
          : <Link href="/contractors/join" className="sq sq-rust">Create a free contractor account</Link>}
      </section>

      <div className="ct-steps">
        <div>
          <h2>Your shortlist</h2>
          <p>Save the trades you rate, sort them into lists such as &ldquo;Soft landscaping, Kent&rdquo;, and keep private notes your whole team can see.</p>
        </div>
        <div>
          <h2>Live paperwork status</h2>
          <p>Every saved trade shows whether their insurance and accreditations are current. We check the certificates, and warn you when something lapses.</p>
        </div>
        <div>
          <h2>Post a package</h2>
          <p>Describe the job, the area and what you need (cover, CHAS, SMAS and so on). Every member who matches gets an email the same day.</p>
        </div>
        <div>
          <h2>Invite your favourites</h2>
          <p>Send a job straight to trades on your shortlist and ask them to price it.</p>
        </div>
        <div>
          <h2>Replies with paperwork</h2>
          <p>Trades reply with one click and can attach their compliance pack and company profile, so you have their insurance, RAMS and PQQ answers from the start.</p>
        </div>
        <div>
          <h2>Your whole team</h2>
          <p>Add buyers, estimators and site managers to one company account. Everyone shares the shortlist and the jobs.</p>
        </div>
      </div>

      <section className="ct-box">
        <h2>Who can join</h2>
        <p>Main contractors, housebuilders, developers and principal contractors who let landscaping, groundworks, fencing and external works packages. We check every company against Companies House and confirm the person signing up works there before you can post jobs.</p>
        <p>It is free. If we ever add paid extras, accounts that join now keep everything they have today for free.</p>
        <p className="muted small">See the <Link href="/legal/contractor-terms">contractor terms</Link> and <Link href="/legal/privacy">privacy notice</Link>. Are you a subcontractor? <Link href="/join">List your business here</Link>.</p>
      </section>
    </div>
  );
}
