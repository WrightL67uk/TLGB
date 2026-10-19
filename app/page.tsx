import Link from 'next/link';
import { TRADES } from '@/lib/config';

export const metadata = {
  title: 'The Little Green Book | Vetted landscaping and external works trades',
  description:
    'Find landscapers, arborists, groundworkers and other external works trades near your job. Every business is checked by hand: Companies House, insurance and accreditations.',
};

const CHECKS = [
  {
    title: 'Companies House',
    body: 'Limited companies are checked live against Companies House. Sole traders send a letterhead, which we check by hand.',
  },
  {
    title: 'Public liability insurance',
    body: 'Every listing has a certificate on file. When cover runs out, the listing comes out of search until it is renewed.',
  },
  {
    title: 'Accreditations',
    body: 'CHAS, Constructionline, SMAS and the rest are shown with their expiry dates. Lapsed ones drop off the listing.',
  },
  {
    title: 'Reminders before anything lapses',
    body: 'Trades get a reminder 30 days and 7 days before insurance or an accreditation expires, so listings stay current.',
  },
];

export default function Home() {
  return (
    <div className="landing">
      <section className="l-hero">
        <p className="l-kicker">Landscaping and external works</p>
        <h1>Vetted trades for your next job, checked before they are listed.</h1>
        <p className="l-lead">
          The Little Green Book is a directory of landscapers, arborists, groundworkers and other external works trades.
          Search by job postcode and see who covers the area, what cover they carry and which accreditations they hold.
        </p>

        <form action="/search" method="get" className="l-search">
          <label>Job postcode
            <input name="postcode" required placeholder="e.g. SG1 1AA" autoComplete="postal-code" />
          </label>
          <label>Trade
            <select name="trade" defaultValue="">
              <option value="">Any trade</option>
              {TRADES.map((t) => <option key={t.slug} value={t.slug}>{t.label}</option>)}
            </select>
          </label>
          <button type="submit" className="primary">Find trades</button>
        </form>
        <p className="small l-note">Free to search. No account needed.</p>
      </section>

      <section className="l-split">
        <div className="l-panel">
          <h2>Looking for a trade</h2>
          <p>Main contractors, housebuilders, councils and managing agents use the book to find subcontractors they can rely on.</p>
          <ul className="l-ticks">
            <li>Search by postcode, trade and minimum public liability cover</li>
            <li>Filter by accreditation, for example CHAS or Constructionline Gold</li>
            <li>Contact the business directly. We take no cut of the work</li>
          </ul>
          <Link href="/search" className="l-btn">Search the book</Link>
        </div>
        <div className="l-panel l-panel-dark">
          <h2>Running a trade business</h2>
          <p>Get found by the contractors who are pricing work in your area, with your checks already done for them.</p>
          <ul className="l-ticks">
            <li>One listing covering every trade you offer and the miles you travel</li>
            <li>Show your insurance and accreditations up front</li>
            <li>Listing fees are banded by turnover, so smaller firms pay less</li>
          </ul>
          <Link href="/join" className="l-btn l-btn-light">List your business</Link>
        </div>
      </section>

      <section className="l-section">
        <h2>What we check</h2>
        <p className="muted">Every business is approved by a person, not a form.</p>
        <div className="l-checks">
          {CHECKS.map((c, i) => (
            <div key={c.title} className="l-check">
              <span className="l-num">{i + 1}</span>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="l-section">
        <h2>Trades in the book</h2>
        <div className="l-trades">
          {TRADES.map((t) => (
            <Link key={t.slug} href={`/search?trade=${t.slug}`} className="l-trade">{t.label}</Link>
          ))}
        </div>
      </section>

      <section className="l-section l-how">
        <h2>How listing works</h2>
        <ol>
          <li><strong>Apply.</strong> Tell us about your business, upload your insurance certificate and any accreditations. It takes about ten minutes.</li>
          <li><strong>We check.</strong> We look over everything by hand, usually within two working days.</li>
          <li><strong>You go live.</strong> Contractors searching your area can find you. Log in any time to update your details, photos and certificates.</li>
        </ol>
      </section>

      <section className="l-cta">
        <div>
          <h2>Built by people from the trade</h2>
          <p>The Little Green Book is run by people who have spent years in commercial landscaping, on both sides of the subcontract.</p>
        </div>
        <div className="l-cta-btns">
          <Link href="/join" className="l-btn l-btn-light">List your business</Link>
          <Link href="/search" className="l-btn l-btn-ghost">Search trades</Link>
        </div>
      </section>
    </div>
  );
}
