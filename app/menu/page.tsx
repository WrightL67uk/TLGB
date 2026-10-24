import { db } from '@/lib/supabase';
import { getMembership } from '@/lib/membership';
import { TEMPLATES } from '@/lib/templates';
import MenuList, { type MenuSection } from './MenuList';
import '../menu.css';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Everything on TLGB | The Little Green Book',
  description: 'Every page, tool, guide, template and download on The Little Green Book in one place.',
};

export default async function MenuPage() {
  const m = await getMembership();

  // With one listing, member links go straight to it; otherwise via the listing picker
  let myId: string | null = null;
  if (m.loggedIn) {
    const { data } = await db().from('businesses').select('id').eq('email', m.email!).neq('status', 'draft');
    if (data?.length === 1) myId = data[0].id as string;
  }
  const mine = (path: string, fallback: string) => (myId ? `/account/${myId}${path}` : fallback);
  const memberTag = m.paid ? undefined : 'Members';

  const sections: MenuSection[] = [
    {
      title: 'Find trades and suppliers',
      items: [
        { label: 'Find a trade', href: '/search', note: 'Search checked landscaping and external works trades by trade and postcode.' },
        { label: 'Suppliers', href: '/suppliers', note: 'Soil, turf, trees, fencing, paving, plant hire and merchants near your job.' },
        { label: 'Add a supplier', href: '/suppliers/add', note: 'Suggest a supplier for the directory.' },
        { label: 'What we check', href: '/#checks', note: 'The checks every business passes before it is listed.' },
      ],
    },
    {
      title: 'Find work',
      items: [
        { label: 'Leads', href: '/leads', note: 'Public contracts and planning leads for landscaping and external works.', tag: memberTag ? 'Full feed for members' : undefined },
        { label: 'Supply chain finder', href: '/supply-chains', note: 'Where to register with main contractors, housebuilders, portals and frameworks.' },
        { label: 'Help board', href: '/help-board', note: 'Need a hand on a job, or have spare capacity? Ask other trades.' },
        { label: 'Post on the help board', href: '/help-board/new', note: 'Ask for labour, a subcontractor, a machine or cover.', tag: memberTag },
      ],
    },
    {
      title: 'Guides and help',
      items: [
        { label: 'All guides', href: '/guides', note: 'Every guide and tool in one list.' },
        { label: 'Finding leads worth chasing', href: '/guides/finding-leads', note: 'Which leads turn into work and how to work each type.' },
        { label: 'Winning tenders and PQQs', href: '/guides/winning-tenders', note: 'Prequalification, pricing to win and getting on approved lists.' },
        { label: 'Accreditation help', href: '/accreditation-help', note: 'Help with Constructionline, CHAS and SSIP applications.' },
      ],
    },
    {
      title: 'Member tools',
      items: [
        { label: 'My listing', href: m.loggedIn ? mine('', '/account') : '/login?next=/account', note: 'Edit your details, insurance, accreditations, photos and membership.', tag: m.loggedIn ? undefined : 'Log in' },
        { label: 'Compliance pack', href: m.loggedIn ? mine('/compliance', '/account/compliance') : '/login?next=/account/compliance', note: 'Insurance, accreditations, RAMS and policies in one place, with share links for contractors.', tag: memberTag },
        { label: 'PQQ answer bank', href: m.loggedIn ? mine('/pqq', '/account/pqq') : '/login?next=/account/pqq', note: 'Save answers to the questions every PQQ and supplier portal asks, then copy them in.', tag: memberTag },
        { label: 'Project references', href: m.loggedIn ? `${mine('/pqq', '/account/pqq')}#sec-projects` : '/login?next=/account/pqq', note: 'Your library of past jobs and client references for tenders.', tag: memberTag },
      ],
    },
    {
      title: 'Downloads',
      items: [
        { label: 'Company profile (Word)', href: myId ? `/api/pqq/export?b=${myId}` : (m.loggedIn ? '/account/pqq' : '/login?next=/account/pqq'), note: 'All your saved PQQ answers and project references as one Word document.', tag: memberTag, download: !!myId },
        { label: 'Compliance pack documents', href: m.loggedIn ? mine('/compliance', '/account/compliance') : '/login?next=/account/compliance', note: 'Download any certificate or policy you have uploaded, or send a share link.', tag: memberTag },
      ],
    },
    {
      title: 'Templates (Word)',
      intro: 'Starter documents with your company name filled in. Have a competent person check them before you use them.',
      items: TEMPLATES.map((t) => ({ label: t.title, href: `/api/templates/${t.slug}`, note: t.note, tag: memberTag, download: m.paid })),
    },
    {
      title: 'Your account',
      items: m.loggedIn
        ? [
            { label: 'All my listings', href: '/account', note: 'Pick a listing if you have more than one.' },
            { label: 'List another business', href: '/join', note: 'Add a second business to the directory.' },
          ]
        : [
            { label: 'List your business', href: '/join', note: 'Apply to be listed. We check every business by hand.' },
            { label: 'Log in', href: '/login', note: 'We email you a login link. No password needed.' },
          ],
    },
  ];

  return (
    <div className="menu-page">
      <h1>Everything on TLGB</h1>
      <p className="lead">Every page, tool, guide, template and download in one place. Type below to find what you are after.</p>
      {!m.paid && (
        <p className="menu-key"><span className="menu-tag">Members</span> Included with membership. {m.loggedIn ? 'Open your listing to start or renew it.' : 'Log in, or list your business to join.'}</p>
      )}
      <MenuList sections={sections} loggedIn={m.loggedIn} />
    </div>
  );
}
