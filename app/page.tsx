import Link from 'next/link';
import VerifiedToggle from './VerifiedToggle';
import { TRADES } from '@/lib/config';

export const metadata = {
  title: 'The Little Green Book | Vetted landscaping and external works trades',
  description:
    'Find landscapers, arborists, groundworkers and other external works trades near your job. Every business is checked by hand: Companies House, insurance and accreditations.',
};

const Icon = {
  search: <svg viewBox="0 0 24 24" aria-hidden><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21" /></svg>,
  list: <svg viewBox="0 0 24 24" aria-hidden><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>,
  shield: <svg viewBox="0 0 24 24" aria-hidden><path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6l-8-3Z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>,
  clock: <svg viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
};

const FEATURES = [
  {
    tone: 'rust', icon: Icon.search, title: 'find a trade', href: '/search', cta: 'search now',
    body: 'Search by job postcode and see who covers the area, what insurance they carry and which accreditations they hold.',
  },
  {
    tone: 'teal', icon: Icon.list, title: 'list your business', href: '/join', cta: 'apply',
    body: 'Get found by the contractors pricing work near you. Fees are banded by turnover, so smaller firms pay less.',
  },
  {
    tone: 'green', icon: Icon.shield, title: 'checked by hand', href: '/#checks', cta: 'what we check',
    body: 'Companies House, public liability and accreditations are looked at by a person before anyone goes live.',
  },
  {
    tone: 'forest', icon: Icon.clock, title: 'always in date', href: '/#how', cta: 'how it works',
    body: 'Trades are reminded before insurance or accreditations run out. Lapsed ones drop off the listing.',
  },
];

const CHECKS = [
  ['Companies House', 'Limited companies are checked live against Companies House. Sole traders send a letterhead, which we check by hand.'],
  ['Public liability', 'Every listing has a certificate on file. When cover runs out, the listing comes out of search until it is renewed.'],
  ['Accreditations', 'CHAS, Constructionline, SMAS and the rest are shown with their expiry dates. Lapsed ones are removed.'],
  ['Reminders', 'Trades are emailed 30 days and 7 days before anything expires, so what you see stays current.'],
];

export default function Home() {
  return (
    <div className="landing">
      <section className="band hero-band">
        <div className="band-in">
          <h1>Find a trade you can rely on</h1>
          <p className="hero-tag">Landscaping and external works trades, checked before they are listed</p>
          <form action="/search" method="get" className="hero-search">
            <label>Job postcode
              <input name="postcode" required placeholder="e.g. SG1 1AA" autoComplete="postal-code" />
            </label>
            <label>Trade
              <select name="trade" defaultValue="">
                <option value="">Any trade</option>
                {TRADES.map((t) => <option key={t.slug} value={t.slug}>{t.label}</option>)}
              </select>
            </label>
            <VerifiedToggle />
            <button type="submit" className="sq sq-rust">find trades</button>
          </form>
          <p className="hero-note">Free to search. No account needed.</p>
        </div>
      </section>

      <section className="band split-band">
        <div className="split-text">
          <h2>About The Little Green Book</h2>
          <p>
            A directory of landscapers, arborists, groundworkers and other external works trades, run by people from the
            industry. Main contractors, housebuilders, councils and managing agents use it to find subcontractors whose
            paperwork has already been checked.
          </p>
          <Link href="/#checks" className="sq sq-outline">what we check</Link>
        </div>
        <div className="split-stat">
          <span className="stat-num">{TRADES.length}</span>
          <span className="stat-label">trade categories</span>
          <span className="stat-num stat-num-sm">4</span>
          <span className="stat-label">checks on every listing</span>
        </div>
      </section>

      <section className="features">
        {FEATURES.map((f) => (
          <div key={f.title} className={`feature tone-${f.tone}`}>
            <span className="f-icon">{f.icon}</span>
            <h2>{f.title}</h2>
            <p>{f.body}</p>
            <Link href={f.href} className="sq">{f.cta}</Link>
          </div>
        ))}
      </section>

      <section className="band rust-band" id="checks">
        <div className="band-in narrow-in">
          <h2>Every business is approved by a person, not a form</h2>
          <div className="check-grid">
            {CHECKS.map(([t, b]) => (
              <div key={t} className="check-item">
                <h3>{t}</h3>
                <p>{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="trades-sec">
        <h2>Trades in the book</h2>
        <div className="l-trades">
          {TRADES.map((t) => (
            <Link key={t.slug} href={`/search?trade=${t.slug}`} className="l-trade">{t.label}</Link>
          ))}
        </div>
      </section>

      <section className="band how-band" id="how">
        <div className="band-in">
          <h2>How listing works</h2>
          <ol className="steps">
            <li><span>1</span><h3>Apply</h3><p>Tell us about your business and upload your insurance certificate and any accreditations. It takes about ten minutes.</p></li>
            <li><span>2</span><h3>We check</h3><p>We look over everything by hand, usually within two working days.</p></li>
            <li><span>3</span><h3>You go live</h3><p>Contractors searching your area can find you. Log in any time to update your details, photos and certificates.</p></li>
          </ol>
          <Link href="/join" className="sq sq-rust">list your business</Link>
        </div>
      </section>
    </div>
  );
}
