import Link from 'next/link';
import '../../resources.css';

export const metadata = {
  title: 'Winning tenders and getting through PQQs | The Little Green Book',
  description: 'How landscaping and external works trades get onto approved lists, pass prequalification and win public and private tenders.',
};

export default function WinningTendersGuide() {
  return (
    <article className="guide">
      <h1>Winning tenders and getting through PQQs</h1>
      <p className="lead">
        Most of the work in this industry goes to firms who are already on someone&rsquo;s list. This guide covers how to get on
        those lists and how to win once you are there.
      </p>

      <h2>1. Get the basics in place before you need them</h2>
      <p>Nearly every prequalification questionnaire (PQQ) or supplier selection questionnaire asks for the same things. Have them ready in one folder:</p>
      <ul>
        <li><strong>An SSIP health and safety accreditation</strong> such as CHAS, SMAS Worksafe or SafeContractor. One SSIP certificate should be accepted in place of another.</li>
        <li><strong>Constructionline</strong>, Silver or Gold. Most tier 1 contractors use it to vet subcontractors, and Gold answers the standard PQQ questions once.</li>
        <li><strong>Insurance certificates:</strong> public liability (&pound;5m is common, &pound;10m for larger contractors), employers liability and, if you design, professional indemnity.</li>
        <li><strong>Your last two years of accounts</strong> and a recent bank or credit reference.</li>
        <li><strong>Policies:</strong> health and safety, environmental, quality, equality, modern slavery (if you are large enough), GDPR and a carbon reduction plan if you bid for central government.</li>
        <li><strong>Trade cards and qualifications:</strong> CSCS or LISS cards for everyone on site, plus pesticide (PA1/PA6), chainsaw, plant and first aid tickets.</li>
        <li><strong>Three to five case studies</strong> with client, value, dates, a photo and a named referee who has agreed to be contacted.</li>
      </ul>
      <div className="callout">
        <p>
          Short of time? We can do the Constructionline, CHAS and SSIP applications for you.{' '}
          <Link href="/accreditation-help">See the accreditation help service</Link>.
        </p>
      </div>

      <h2>2. Get onto supply chains</h2>
      <p>Main contractors and housebuilders only invite firms they have already approved. To get approved:</p>
      <ol>
        <li>Pick ten to twenty contractors who build in your area and the sectors you want (schools, housing, healthcare, highways).</li>
        <li>Use the <Link href="/supply-chains">supply chain finder</Link> to see how each one vets suppliers. Many use Constructionline and publish a sign-up code.</li>
        <li>Complete their registration fully. Half-finished profiles are ignored.</li>
        <li>Then get in touch with the regional buyer or commercial manager. Say which jobs you have seen them win nearby and what you could price.</li>
        <li>Go to their meet the buyer days and supply chain events. Buyers put faces to names.</li>
        <li>Price everything they send you at first, even small packages. Declining early invitations is the quickest way off a list.</li>
      </ol>
      <p>
        The <Link href="/leads?type=award">contractor wins</Link> on the leads page tell you who has just won what. That is the best
        moment to introduce yourself.
      </p>

      <h2>3. Decide which tenders to bid</h2>
      <p>Bidding takes time. Before you start, check:</p>
      <ul>
        <li>Can you meet every pass or fail requirement? Turnover, insurance levels, accreditations, years trading.</li>
        <li>Is the value right for you? A common rule is that the contract should not be more than about a quarter to a third of your annual turnover.</li>
        <li>Is it in your area, or can you price the travel and still be competitive?</li>
        <li>How is it scored? Look at the price and quality split. If quality is 60% or more, a well written bid can beat a cheaper one.</li>
        <li>Do you have time to do it properly before the deadline?</li>
      </ul>

      <h2>4. Write the bid to the scoring</h2>
      <ul>
        <li><strong>Answer the question that was asked</strong>, in the order the buyer set it out. Use their headings.</li>
        <li><strong>Be specific to the job.</strong> Name the site, the client, the programme and the risks you can see. Generic text scores badly.</li>
        <li><strong>Prove it.</strong> Every claim should have an example, a number or a document behind it.</li>
        <li><strong>Watch the word or page limits.</strong> Anything over the limit is often not read.</li>
        <li><strong>Social value</strong> is now scored on most public contracts. Local labour, apprentices, local spend, work with schools and charities, and biodiversity all count. Make commitments you can measure and keep.</li>
        <li><strong>Ask clarification questions</strong> through the portal before the deadline if anything is unclear. Everyone sees the answers, and buyers notice who asked sensible questions.</li>
      </ul>

      <h2>5. Price to win, and to make money</h2>
      <ul>
        <li>Price the specification as written. If you think something is wrong, price it as written and offer an alternative separately.</li>
        <li>Check the quantities. Errors in a bill of quantities are common and can work for or against you.</li>
        <li>Allow for establishment and aftercare: watering, defects periods and plant replacements often catch landscapers out.</li>
        <li>Read the contract terms: retention, payment terms, liquidated damages and any design responsibility.</li>
        <li>Submit early. Portals slow down in the last hour and late bids are rejected automatically.</li>
      </ul>

      <h2>6. Win or lose, ask for feedback</h2>
      <p>
        Public buyers must give you your scores and, usually, the winner&rsquo;s. Read them. The gap between your score and the winner&rsquo;s
        tells you exactly what to improve. Keep every bid in a library so the next one is quicker.
      </p>

      <div className="next">
        <Link href="/supply-chains" className="sq sq-rust">supply chain finder</Link>
        <Link href="/accreditation-help" className="sq" style={{ background: 'var(--forest)' }}>accreditation help</Link>
        <Link href="/leads" className="sq" style={{ background: 'var(--teal)' }}>leads</Link>
      </div>
    </article>
  );
}
