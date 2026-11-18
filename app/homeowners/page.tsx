import Link from 'next/link';
import '../resources.css';

export const metadata = {
  title: 'Find a landscaper or gardener for your home | The Little Green Book',
  description: 'Search checked landscapers, gardeners, groundworkers and suppliers that work for homeowners. Free to search.',
};

export default function Homeowners() {
  return (
    <div className="narrow">
      <h1>Find someone for your home and garden</h1>
      <p className="lead">The Little Green Book is mostly used by landscaping businesses working for contractors. Some of them also work for homeowners. Those businesses carry a <span className="badge ok">Homeowners welcome</span> badge.</p>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>How to find them</h2>
        <ol>
          <li>Search with your postcode and tick <strong>Homeowner jobs</strong>.</li>
          <li>Pick the trade you need, such as landscaper, garden designer, tree surgeon or fencing.</li>
          <li>Look for the <strong>Verified member</strong> badge. It means we have checked their insurance and company details.</li>
          <li>Contact two or three, and ask to see their insurance certificate before you agree any work.</li>
        </ol>
        <p><Link href="/search?home=1&v=1&verified=1" className="sq sq-rust">find a trade near me</Link> <Link href="/suppliers?home=1" className="sq">find a supplier</Link></p>
      </div>

      <p className="muted small">Free for homeowners. Businesses choose for themselves whether to show the homeowners badge, so if you cannot find someone near you, try again without ticking Homeowner jobs and ask whether they take private work.</p>
    </div>
  );
}
