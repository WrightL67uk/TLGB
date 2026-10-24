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
        { label: 'Leads', href: '/leads', note: 'Public contracts and planning leads for landscaping and external works.', k: 'tenders work opportunities contracts finder planning', tag: memberTag ? 'Full feed for members' : undefined },
        { label: 'Jobs from main contractors', href: '/jobs', note: 'Packages posted direct by main contractors and housebuilders. Matching jobs are emailed to members.', k: 'contractor packages tenders price invite', tag: memberTag },
        { label: 'Supply chain finder', href: '/supply-chains', note: 'Where to register with main contractors, housebuilders, portals and frameworks.' },
        { label: 'Help board', href: '/help-board', note: 'Need a hand on a job, or have spare capacity? Ask other trades.' },
        { label: 'Post on the help board', href: '/help-board/new', note: 'Ask for labour, a subcontractor, a machine or cover.', tag: memberTag },
      ],
    },
    {
      title: 'Guides and help',
      items: [
        { label: 'The retention ban', href: '/guides/retention-ban', note: 'Where the Commercial Payments Bill has got to, when the ban could start, and what to do now.', k: 'retention ban commercial payments bill retentions bond defects 60 day payment terms law change' },
        { label: 'Payment dates calculator', href: '/tools/payment-dates', note: 'Due date, payment notice, pay less notice and final date under the Construction Act. Free.', k: 'payment notice pay less final date scheme construction act late payment interest suspend' },
        { label: 'All guides', href: '/guides', note: 'Every guide and tool in one list.' },
        { label: 'Finding leads worth chasing', href: '/guides/finding-leads', note: 'Which leads turn into work and how to work each type.' },
        { label: 'Winning tenders and PQQs', href: '/guides/winning-tenders', note: 'Prequalification, pricing to win and getting on approved lists.', k: 'pqq tender bid' },
        { label: 'Accreditation help', href: '/accreditation-help', note: 'Help with Constructionline, CHAS and SSIP applications.', k: 'smas safecontractor accreditation gold silver' },
      ],
    },
    {
      title: 'Member tools',
      items: [
        { label: 'My listing', href: m.loggedIn ? mine('', '/account') : '/login?next=/account', note: 'Edit your details, insurance, accreditations, photos and membership.', k: 'account profile certificate expiry renew payment billing subscription logo', tag: m.loggedIn ? undefined : 'Log in' },
        { label: 'Compliance pack', href: m.loggedIn ? mine('/compliance', '/account/compliance') : '/login?next=/account/compliance', note: 'Insurance, accreditations, RAMS and policies in one place, with share links for contractors.', k: 'documents certificates upload share link chas smas constructionline ssip method statement risk assessment policy expiry', tag: memberTag },
        { label: 'PQQ answer bank', href: m.loggedIn ? mine('/pqq', '/account/pqq') : '/login?next=/account/pqq', note: 'Save answers to the questions every PQQ and supplier portal asks, then copy them in.', k: 'prequalification questionnaire tender portal answers turnover accident figures sq selection', tag: memberTag },
        { label: 'Team and training', href: m.loggedIn ? mine('/team', '/account/team') : '/login?next=/account/team', note: 'Every card and ticket your team holds, with expiry reminders and a training matrix you can download.', k: 'cscs liss cpcs npors pa1 pa6 first aid sssts smsts training matrix cards tickets qualifications operatives staff expiry', tag: memberTag },
        { label: 'Payment tracker', href: m.loggedIn ? mine('/payments', '/account/payments') : '/login?next=/account/payments', note: 'Every application, deadline and retention, with alerts and ready-made notices.', k: 'payment notice pay less final date retention suspend interest late payment construction act application valuation', tag: memberTag },
        { label: 'Project references', href: m.loggedIn ? `${mine('/pqq', '/account/pqq')}#sec-projects` : '/login?next=/account/pqq', note: 'Your library of past jobs and client references for tenders.', k: 'case studies experience similar contracts referees', tag: memberTag },
      ],
    },
    {
      title: 'Downloads',
      items: [
        { label: 'Training matrix (Word)', href: myId ? `/api/team/matrix?b=${myId}` : (m.loggedIn ? '/account' : '/login?next=/account'), note: 'Everyone on your team and the cards they hold, coloured by expiry.', k: 'training matrix download word cscs cards', tag: memberTag, download: !!myId && m.paid },
        { label: 'Company profile (Word)', href: myId ? `/api/pqq/export?b=${myId}` : (m.loggedIn ? '/account/pqq' : '/login?next=/account/pqq'), note: 'All your saved PQQ answers and project references as one Word document.', k: 'pqq export download word doc', tag: memberTag, download: !!myId },
        { label: 'Compliance pack documents', href: m.loggedIn ? mine('/compliance', '/account/compliance') : '/login?next=/account/compliance', note: 'Download any certificate or policy you have uploaded, or send a share link.', tag: memberTag },
      ],
    },
    {
      title: 'Templates (Word)',
      intro: 'Starter documents with your company name filled in. Have a competent person check them before you use them.',
      items: TEMPLATES.map((t) => ({ label: t.title, href: `/api/templates/${t.slug}`, note: t.note, tag: memberTag, download: m.paid, k: 'template word policy document download' + (t.slug.startsWith('rams') ? ' rams method statement risk assessment' : '') })),
    },
    {
      title: 'For main contractors',
      intro: 'Free accounts for main contractors, housebuilders and developers.',
      items: [
        { label: 'How it works for contractors', href: '/contractors', note: 'Shortlist checked trades, post packages and get replies with paperwork attached.', k: 'main contractor housebuilder developer free' },
        { label: 'Create a contractor account', href: '/contractors/join', note: 'Free. We check your company before you can post jobs.', k: 'sign up register' },
        { label: 'Contractor dashboard', href: '/contractor', note: 'Your shortlist, jobs, replies and team.', k: 'favourites shortlist post job replies team' },
        { label: 'Shortlist and paperwork alerts', href: '/contractor/shortlist', note: 'Saved trades, with an email when their insurance or accreditations are about to expire, lapse or are renewed.', k: 'favourites alerts insurance expiry accreditation lapsed renewed' },
        { label: 'Post a job', href: '/contractor/jobs/new', note: 'Send a package to every member who matches your trade, area and requirements.', k: 'package tender invite' },
      ],
    },
    {
      title: 'Legal and policies',
      items: [
        { label: 'Website terms', href: '/legal/terms', note: 'The rules for using this website.', k: 'terms and conditions' },
        { label: 'Member terms', href: '/legal/member-terms', note: 'Membership, payment, renewal, cancellation and refunds for listed trades.', k: 'subscription cancel refund payment' },
        { label: 'Contractor terms', href: '/legal/contractor-terms', note: 'Using the free contractor account and posting jobs.' },
        { label: 'Privacy notice', href: '/legal/privacy', note: 'What personal data we hold, why, who we share it with and your rights.', k: 'gdpr data protection personal information' },
        { label: 'Cookie policy', href: '/legal/cookies', note: 'The one cookie we use and why.', k: 'cookies' },
        { label: 'Acceptable use', href: '/legal/acceptable-use', note: 'What you must not do on the site.' },
        { label: 'Complaints', href: '/legal/complaints', note: 'How to raise a complaint and what happens next.', k: 'complain dispute' },
      ],
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
