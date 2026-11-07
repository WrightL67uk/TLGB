import Link from 'next/link';
import { HOW_TOS, GROUPS } from '@/lib/howTo';
import '../resources.css';

export const metadata = {
  title: 'Guides | The Little Green Book',
  description: 'How to use every part of The Little Green Book, plus practical guides on finding leads, winning tenders and the retention ban.',
};

const KNOW_HOW = [
  { href: '/guides/finding-leads', title: 'Finding leads worth chasing', text: 'Which leads turn into work, and how to work each type.' },
  { href: '/guides/winning-tenders', title: 'Winning tenders and PQQs', text: 'Prequalification, pricing to win and getting onto contractors’ approved lists.' },
  { href: '/guides/retention-ban', title: 'The retention ban', text: 'Where the law has got to, when it could start and what to do now.' },
];

const TOOLS = [
  { href: '/tools/payment-dates', title: 'Payment dates calculator', text: 'Every Construction Act deadline for an application. Free.' },
  { href: '/supply-chains', title: 'Supply chain finder', text: 'Where to register with main contractors, housebuilders, portals and frameworks.' },
  { href: '/accreditation-help', title: 'Help with Constructionline, CHAS and SSIP', text: 'Let us do the paperwork for your accreditation applications.' },
  { href: '/suppliers', title: 'Suppliers', text: 'Soil, turf, trees, fencing, paving and more. Free to search.' },
  { href: '/menu', title: 'Everything on TLGB', text: 'Every page, tool, template and download in one list, with a search box.' },
];

export default function GuidesPage() {
  return (
    <div>
      <h1>Guides</h1>
      <p className="lead">How to use every part of the site, and straight answers on finding work, winning it and getting paid.</p>

      {GROUPS.map((g) => (
        <section key={g.key} style={{ marginBottom: 28 }}>
          <h2 style={{ color: 'var(--forest)', marginBottom: 4 }}>{g.title}</h2>
          <p className="muted" style={{ margin: '0 0 12px' }}>{g.blurb}</p>
          <div className="guide-index">
            {HOW_TOS.filter((h) => h.group === g.key).map((h) => (
              <Link key={h.slug} href={`/guides/${h.slug}`}>
                <h2>{h.title}</h2>
                <p>{h.summary}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ color: 'var(--forest)', marginBottom: 4 }}>Know-how</h2>
        <p className="muted" style={{ margin: '0 0 12px' }}>Practical advice for landscaping and external works businesses.</p>
        <div className="guide-index">
          {KNOW_HOW.map((k) => <Link key={k.href} href={k.href}><h2>{k.title}</h2><p>{k.text}</p></Link>)}
        </div>
      </section>

      <section>
        <h2 style={{ color: 'var(--forest)', marginBottom: 4 }}>Free tools</h2>
        <p className="muted" style={{ margin: '0 0 12px' }}>Open to everyone, no login needed.</p>
        <div className="guide-index">
          {TOOLS.map((k) => <Link key={k.href} href={k.href}><h2>{k.title}</h2><p>{k.text}</p></Link>)}
        </div>
      </section>
    </div>
  );
}
