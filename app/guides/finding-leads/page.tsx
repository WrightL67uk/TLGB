import Link from 'next/link';
import '../../resources.css';

export const metadata = {
  title: 'Finding leads worth chasing | The Little Green Book',
  description: 'Which leads turn into work for landscaping, fencing, tree and external works trades, and how to work each type.',
};

export default function FindingLeadsGuide() {
  return (
    <article className="guide">
      <h1>Finding leads worth chasing</h1>
      <p className="lead">
        The leads page pulls in thousands of opportunities every morning. Most trades do not have time to chase all of them,
        so this is how we would rank them and what to do with each one.
      </p>

      <h2>The short version</h2>
      <div className="rank">
        <div>
          <h3>1. Open tenders <span className="stars">best</span></h3>
          <p>A buyer has the budget, the scope is written down and there is a deadline. If you meet the requirements you can price it today.</p>
        </div>
        <div>
          <h3>2. Contractor wins <span className="stars">very good</span></h3>
          <p>A main contractor has just won a building or civils job over &pound;1m. They now need landscaping, groundworks and fencing packages priced, and few subcontractors call them this early.</p>
        </div>
        <div>
          <h3>3. Landscaping details submitted <span className="stars">good</span></h3>
          <p>A developer is getting the landscaping condition signed off on a site with planning. The planting is close, and the applicant or agent is named.</p>
        </div>
        <div>
          <h3>4. Coming up <span className="stars">good, but plan ahead</span></h3>
          <p>Advance notices of tenders that have not opened yet. Use them to get registered and prepared before the rush.</p>
        </div>
        <div>
          <h3>5. New developments and tree works <span className="stars">long game</span></h3>
          <p>Useful for building relationships and spotting work early, but there is no buyer asking for a price yet.</p>
        </div>
      </div>

      <h2>Why open tenders and contractor wins come first</h2>
      <p>
        Both have a named buyer, real money and a timescale. With an open tender, the buyer has already decided to spend, has
        written the scope and has told everyone the deadline. You are competing, but on a level field, and public buyers have
        to score bids fairly.
      </p>
      <p>
        A contractor win is the step after a tender somebody else has won. Main contractors price external works on a budget
        figure to win the job, then go out to subcontractors once they have it. The weeks straight after an award are when
        their buyers are building the package list. A short, well-timed email with your accreditations and two or three
        similar jobs gets you on that list before the people who wait for an invitation.
      </p>
      <div className="callout">
        <p>
          <strong>Tip:</strong> when you see a contractor win in your area, look the contractor up in the{' '}
          <Link href="/supply-chains">supply chain finder</Link>. If they use Constructionline, make sure your profile is complete
          before you get in touch, because that is the first thing their buyer will check.
        </p>
      </div>

      <h2>How to work each type</h2>
      <h3>Open tenders</h3>
      <ul>
        <li>Read the requirements before anything else. If they ask for &pound;10m public liability, two years of accounts or an accreditation you do not have, move on.</li>
        <li>Check the closing date and work backwards. Most bids take longer than people expect.</li>
        <li>Register on the portal named in the notice as soon as you decide to bid. Clarification questions often have an earlier deadline.</li>
        <li>Our <Link href="/guides/winning-tenders">guide to winning tenders</Link> covers the bid itself.</li>
      </ul>

      <h3>Contractor wins</h3>
      <ul>
        <li>Find the contractor&rsquo;s regional office for the job, not head office.</li>
        <li>Ask for the buyer or commercial manager running the subcontract packages.</li>
        <li>Send a one-page introduction: what you do, your accreditations, your insurance levels and two similar jobs with values.</li>
        <li>Ask when they expect to issue the external works or landscaping package and whether you need to register first.</li>
      </ul>

      <h3>Landscaping details submitted</h3>
      <ul>
        <li>Open the application and look at the documents. The landscape plan tells you the scope: tree numbers, planting areas, turf, hard landscaping.</li>
        <li>The applicant is usually the developer. If an agent is named, they can often tell you who is building it.</li>
        <li>Contact the site manager or the developer&rsquo;s regional buying team. Housebuilders often appoint landscapers late, so this can be a quick win.</li>
      </ul>

      <h3>Coming up</h3>
      <ul>
        <li>Note the expected tender date and the portal it will run on.</li>
        <li>Get registered on that portal now and sort any missing accreditation.</li>
        <li>Some notices invite market engagement or supplier days. Go to them: buyers remember who turned up.</li>
      </ul>

      <h3>New developments</h3>
      <ul>
        <li>Large applications take months to be decided and longer to start. Treat them as a list of future sites and developers to know.</li>
        <li>Note the developer and agent. When the same names keep appearing in your area, that is who to build a relationship with.</li>
      </ul>

      <h3>Tree works</h3>
      <ul>
        <li>These are applications to work on protected trees. Often the homeowner has already used a tree surgeon to apply, but not always.</li>
        <li>The council decision and any conditions are public, which helps you price accurately.</li>
      </ul>

      <h2>Make the filters do the work</h2>
      <ul>
        <li>Log in and the leads page shows <strong>matched to me</strong>: only the trades on your listing, within the area you cover.</li>
        <li>Use the type tabs to look at one kind of lead at a time. Start each week with open tenders and contractor wins.</li>
        <li>If you cover more trades or a bigger area than your listing says, update your listing and the matches update with it.</li>
      </ul>

      <div className="next">
        <Link href="/leads" className="sq sq-rust">go to leads</Link>
        <Link href="/guides/winning-tenders" className="sq" style={{ background: 'var(--forest)' }}>winning tenders</Link>
      </div>
    </article>
  );
}
