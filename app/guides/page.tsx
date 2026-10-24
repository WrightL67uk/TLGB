import Link from 'next/link';
import '../resources.css';

export const metadata = {
  title: 'Guides | The Little Green Book',
  description: 'Practical guides for landscaping and external works trades: picking leads worth chasing, winning tenders and getting onto contractors’ supply chains.',
};

export default function GuidesPage() {
  return (
    <div>
      <h1>Guides and tools</h1>
      <p className="lead">Straight answers on finding work, winning it and getting onto the lists that matter.</p>
      <div className="guide-index">
        <Link href="/guides/finding-leads">
          <h2>Finding leads worth chasing</h2>
          <p>Which of the leads on this site turn into work, and how to work each type.</p>
        </Link>
        <Link href="/guides/winning-tenders">
          <h2>Winning tenders and PQQs</h2>
          <p>Getting through prequalification, pricing to win and getting onto contractors&rsquo; approved lists.</p>
        </Link>
        <Link href="/tools/payment-dates">
          <h2>Payment dates calculator</h2>
          <p>Every Construction Act deadline for an application: payment notice, pay less notice, final date and suspension.</p>
        </Link>
        <Link href="/supply-chains">
          <h2>Supply chain finder</h2>
          <p>Where to register with main contractors, housebuilders, portals and frameworks.</p>
        </Link>
        <Link href="/accreditation-help">
          <h2>Help with Constructionline, CHAS and SSIP</h2>
          <p>Let us do the paperwork for your accreditation applications.</p>
        </Link>
        <Link href="/suppliers">
          <h2>Suppliers</h2>
          <p>Soil, turf, trees, fencing, paving and more. Free to search.</p>
        </Link>
        <Link href="/menu">
          <h2>Everything on TLGB</h2>
          <p>Every page, tool, template and download in one list, with a search box.</p>
        </Link>
        <Link href="/help-board">
          <h2>Help board</h2>
          <p>Need a hand on a job, or have spare capacity? Ask other trades here.</p>
        </Link>
      </div>
    </div>
  );
}
