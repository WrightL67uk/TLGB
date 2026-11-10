import Link from 'next/link';

export const metadata = {
  title: 'Tenders | The Little Green Book',
  description: 'Two ways to find landscaping and external works: Public Tenders we gather every morning, and TLGB Tenders posted straight to us by main contractors.',
};

/** One menu item for both ways of finding work: leads (we find them) and jobs (contractors post them). */
export default function TendersPage() {
  return (
    <div>
      <h1>Tenders</h1>
      <p className="lead">There are two ways to find work on The Little Green Book. Public Tenders are opportunities we go out and find for you. TLGB Tenders are packages main contractors post straight to us because they want a subcontractor.</p>

      <div className="tenders-grid">
        <section className="panel tender-opt">
          <p className="tender-tag">We find them</p>
          <h2>Public Tenders</h2>
          <p>Every morning we gather work for landscaping and external works trades from public sources, then match it to your trades and the area you cover.</p>
          <ul>
            <li>Public tenders, and tenders that are coming up</li>
            <li>Building contracts just won by main contractors, so you can get in early on the landscaping package</li>
            <li>New planning applications and tree works applications</li>
          </ul>
          <p className="muted small">Best for: getting ahead of work before it is let, and bidding on public contracts.</p>
          <Link href="/leads" className="sq sq-rust">see public tenders</Link>
        </section>

        <section className="panel tender-opt">
          <p className="tender-tag">They come to you</p>
          <h2>TLGB Tenders</h2>
          <p>Main contractors, housebuilders and developers post packages directly on TLGB when they need a subcontractor.</p>
          <ul>
            <li>Real packages from contractors who want to hear from you</li>
            <li>Tenders matching your trade, area and paperwork are emailed to you the day they are posted</li>
            <li>Reply in a couple of clicks with your compliance pack attached</li>
          </ul>
          <p className="muted small">Best for: direct invitations to price, with a named contractor at the other end.</p>
          <Link href="/jobs" className="sq sq-rust">see TLGB tenders</Link>
        </section>
      </div>

      <p className="muted">Full details of Public Tenders and TLGB Tenders are for verified members. <Link href="/join">List your business</Link> to get them.</p>
      <p className="muted">Main contractor with a package to let? <Link href="/contractors/join">Post a tender for free</Link>.</p>
    </div>
  );
}
