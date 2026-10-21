import Link from 'next/link';
import '../resources.css';

export const metadata = {
  title: 'Help with Constructionline, CHAS and SSIP applications | The Little Green Book',
  description: 'We prepare and submit your Constructionline, CHAS, SMAS and other SSIP accreditation applications, so you can get on with the work.',
};

const SCHEMES = ['Constructionline Silver', 'Constructionline Gold', 'CHAS', 'SMAS Worksafe', 'SafeContractor', 'Acclaim', 'Renewal of an existing accreditation', 'Not sure what I need'];

export default async function AccreditationHelpPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const { sent, error } = await searchParams;
  return (
    <article className="guide">
      <h1>Help with Constructionline, CHAS and SSIP</h1>
      <p className="lead">
        Most main contractors and public buyers will not invite you to price without these. The applications take days of
        paperwork. We do that part for you.
      </p>

      <h2>What we do</h2>
      <ul>
        <li>Work out which accreditations you actually need for the clients and contractors you want to work for.</li>
        <li>Write or update the policies the assessors ask for: health and safety, environmental, quality, equality and more.</li>
        <li>Put together the risk assessments, method statements and evidence for your trade.</li>
        <li>Fill in and submit the application, and deal with the assessor&rsquo;s questions until it passes.</li>
        <li>Remind you before renewal, and handle the renewal too if you want.</li>
      </ul>

      <h2>How it works</h2>
      <div className="price-cards">
        <div><h3>1. Short call</h3><p>We find out what you have already, who you want to work for and which schemes make sense.</p></div>
        <div><h3>2. Fixed price</h3><p>You get a fixed price before we start. No hourly charges and no surprises.</p></div>
        <div><h3>3. We prepare it</h3><p>We send you a short list of what we need from you, then write and assemble everything else.</p></div>
        <div><h3>4. Submitted and passed</h3><p>We submit it and answer the assessor until it is approved.</p></div>
      </div>
      <p className="muted small">The schemes&rsquo; own membership fees are paid by you directly to the scheme. Our price covers the work of preparing and submitting the application.</p>

      <h2>Ask for a price</h2>
      {sent ? (
        <p className="ok-box"><strong>Thanks, we have your enquiry.</strong> We will be in touch within two working days.</p>
      ) : (
        <form className="res-form" method="post" action="/api/enquiries/accreditation">
          {error && <p className="err big">{error}</p>}
          <div className="row">
            <label>Your name<input name="name" required maxLength={120} autoComplete="name" /></label>
            <label>Business name<input name="business" maxLength={160} autoComplete="organization" /></label>
          </div>
          <div className="row">
            <label>Email<input name="email" type="email" required maxLength={200} autoComplete="email" /></label>
            <label>Phone<input name="phone" type="tel" maxLength={30} autoComplete="tel" /></label>
          </div>
          <div>
            <strong>Which do you need help with?</strong>
            <div className="checks">
              {SCHEMES.map((s) => <label key={s}><input type="checkbox" name="schemes" value={s} /> {s}</label>)}
            </div>
          </div>
          <label>Anything else we should know?
            <textarea name="message" maxLength={2000} placeholder="e.g. who you are trying to get onto, any deadline, what you already have" />
          </label>
          <label className="hp" aria-hidden="true">Leave this empty<input name="company_url" tabIndex={-1} autoComplete="off" /></label>
          <button type="submit" className="primary">send enquiry</button>
        </form>
      )}

      <p>Not sure where accreditations fit in? Read <Link href="/guides/winning-tenders">winning tenders and PQQs</Link>.</p>
    </article>
  );
}
