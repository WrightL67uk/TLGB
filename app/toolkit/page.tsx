import Link from 'next/link';
import { TEMPLATES } from '@/lib/templates';
import '../resources.css';

export const metadata = {
  title: 'Toolkit | The Little Green Book',
  description: 'Tools for landscaping and external works businesses: get estimates from suppliers, payment date calculator, supply chain finder, accreditation help and Word templates.',
};

const TOOLS = [
  { href: '/account/quotes', title: 'Estimates', text: 'Send one plant or materials list to several suppliers and compare their prices side by side. For members.', tag: 'Members' },
  { href: '/tools/payment-dates', title: 'Payment dates calculator', text: 'Every Construction Act deadline for an application, with the notices to send. Free.' },
  { href: '/supply-chains', title: 'Supply chain finder', text: 'Where to register with main contractors, housebuilders, portals and frameworks.' },
  { href: '/accreditation-help', title: 'Help with Constructionline, CHAS and SSIP', text: 'Let us do the paperwork for your accreditation applications.' },
  { href: '/suppliers', title: 'Suppliers', text: 'Soil, turf, trees, fencing, paving and more. Free to search.' },
  { href: '/menu', title: 'Everything on TLGB', text: 'Every page, tool, template and download in one list, with a search box.' },
];

const MEMBER_TOOLS = [
  { href: '/account/compliance', title: 'Compliance pack', text: 'Insurance, accreditations, RAMS and policies in one place, with share links for contractors.' },
  { href: '/account/pqq', title: 'PQQ answer bank', text: 'Save the answers to the questions every PQQ asks, then copy them in.' },
  { href: '/account/team', title: 'Team and training', text: 'Every card and ticket your team holds, with expiry reminders and a downloadable matrix.' },
  { href: '/account/payments', title: 'Payment tracker', text: 'Every application, deadline and retention, with alerts and ready-made notices.' },
  { href: '/account/website', title: 'Your free website', text: 'A three-page website written from your listing, with an enquiry form.' },
];

export default function ToolkitPage() {
  return (
    <div>
      <h1>Toolkit</h1>
      <p className="lead">The tools that save you time and paperwork. Guides on how to use them are in <Link href="/guides">Guides</Link>.</p>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ color: 'var(--forest)', marginBottom: 4 }}>Tools and finders</h2>
        <p className="muted" style={{ margin: '0 0 12px' }}>Most are free to use without logging in.</p>
        <div className="guide-index">
          {TOOLS.map((k) => <Link key={k.href} href={k.href}><h2>{k.title}{k.tag ? <> <small className="muted">{k.tag}</small></> : null}</h2><p>{k.text}</p></Link>)}
        </div>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ color: 'var(--forest)', marginBottom: 4 }}>Member tools</h2>
        <p className="muted" style={{ margin: '0 0 12px' }}>Included with membership. You will be asked to log in.</p>
        <div className="guide-index">
          {MEMBER_TOOLS.map((k) => <Link key={k.href} href={k.href}><h2>{k.title}</h2><p>{k.text}</p></Link>)}
        </div>
      </section>

      <section>
        <h2 style={{ color: 'var(--forest)', marginBottom: 4 }}>Templates (Word)</h2>
        <p className="muted" style={{ margin: '0 0 12px' }}>Starter documents with your company name filled in. Members can download them. Have a competent person check them before you use them.</p>
        <div className="guide-index">
          {TEMPLATES.map((t) => <Link key={t.slug} href={`/api/templates/${t.slug}`}><h2>{t.title}</h2><p>{t.note}</p></Link>)}
        </div>
      </section>
    </div>
  );
}
