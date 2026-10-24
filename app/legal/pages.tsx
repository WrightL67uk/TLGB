import Link from 'next/link';
import type { ReactNode } from 'react';
import { legalDetails } from '@/lib/legal';

type D = ReturnType<typeof legalDetails>;
export type LegalPage = { slug: string; title: string; summary: string; body: (d: D) => ReactNode };

const Mail = ({ d }: { d: D }) => <a href={`mailto:${d.email}`}>{d.email}</a>;

function WhoWeAre({ d }: { d: D }) {
  return (
    <p>
      The Little Green Book (&ldquo;TLGB&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is the website at tlgb.co.uk, run by {d.operator}
      {d.address ? <>, of {d.address}</> : null}. You can contact us at <Mail d={d} />.
    </p>
  );
}

export const LEGAL_PAGES: LegalPage[] = [
  // -----------------------------------------------------------------
  {
    slug: 'terms',
    title: 'Website terms of use',
    summary: 'The rules for anyone using this website.',
    body: (d) => (
      <>
        <h2>1. About these terms</h2>
        <WhoWeAre d={d} />
        <p>These terms apply to everyone who uses the website. If you list your business with us, the <Link href="/legal/member-terms">member terms</Link> also apply. If you have a main contractor account, the <Link href="/legal/contractor-terms">contractor terms</Link> also apply. By using the website you agree to these terms and to our <Link href="/legal/acceptable-use">acceptable use policy</Link>.</p>

        <h2>2. What the website is</h2>
        <p>TLGB is a directory of landscaping, external works and related trades and suppliers, with tools for finding work, keeping compliance documents and answering prequalification questionnaires. It is a business-to-business service. It is not intended for children, and you should only use it on behalf of a business.</p>

        <h2>3. Our checks, and yours</h2>
        <p>We check every listed business by hand when it joins and when certain details change. That can include its Companies House record, insurance certificates and accreditation certificates. These checks are a snapshot based on documents supplied to us. They are not a guarantee of a business&rsquo;s quality, workmanship, solvency, insurance cover or suitability for your job.</p>
        <p>Before you hire, buy from or subcontract to anyone you find through TLGB, carry out the checks you would normally make, including asking for current insurance certificates and references. Any contract you make is between you and the other business. We are not a party to it, we do not act as an agent for anyone, and we do not take commission.</p>
        <p>If a business&rsquo;s membership lapses or its insurance expires, its listing shows as &ldquo;Unverified&rdquo; until it gives us current documents.</p>

        <h2>4. Leads and public information</h2>
        <p>Leads on the website come from public sources such as Contracts Finder, Find a Tender, Public Contracts Scotland, Sell2Wales and council planning registers (through UK PlanIt). Public sector information is used under the Open Government Licence v3.0. We match and summarise this information automatically, so it can be incomplete, late or wrongly matched to a trade. Always read the original notice before acting on it.</p>

        <h2>5. Guides and templates</h2>
        <p>Our guides and document templates are general information to help you get started. They are not legal, health and safety or financial advice. A competent person should check and adapt any template, policy, risk assessment or method statement before you rely on it.</p>

        <h2>6. Content you add</h2>
        <p>You are responsible for what you put on the website, including listings, documents, PQQ answers, help board posts, job posts and replies. You must have the right to share it, it must be accurate, and it must not break the <Link href="/legal/acceptable-use">acceptable use policy</Link>. You let us host, copy, display and send it as needed to run the service. You keep any ownership you have in it.</p>
        <p>We may edit, hide or remove anything that we reasonably think breaks these terms or the law, and suspend accounts that do.</p>

        <h2>7. Our content</h2>
        <p>The website&rsquo;s design, text, guides, templates and the way we have compiled our directory belong to us or our licensors. You may use them for your own business. You may not copy the directory or leads in bulk, scrape the website, or resell our content.</p>

        <h2>8. Availability and changes</h2>
        <p>We aim to keep the website running but do not promise it will always be available or free of errors. We may change, add or remove features. We may update these terms; the date at the top shows when they last changed, and we will tell members and contractors by email about significant changes.</p>

        <h2>9. Our liability</h2>
        <p>Nothing in these terms limits liability for death or personal injury caused by negligence, for fraud, or for anything else that cannot be limited by law.</p>
        <p>Otherwise, we are not liable for any loss arising from your dealings with other businesses found through the website, from relying on leads, guides or templates, or for loss of profit, revenue, contracts, business or data, or any indirect loss. Our total liability to you in any 12 months is limited to the greater of £100 and the fees you paid us in that period.</p>

        <h2>10. Law</h2>
        <p>These terms are governed by the law of England and Wales, and the courts of England and Wales have jurisdiction. If you have a complaint, please see our <Link href="/legal/complaints">complaints procedure</Link> first.</p>
      </>
    ),
  },

  // -----------------------------------------------------------------
  {
    slug: 'member-terms',
    title: 'Member terms',
    summary: 'For trades and suppliers who list their business: membership, payment, renewal and cancellation.',
    body: (d) => (
      <>
        <h2>1. These terms</h2>
        <WhoWeAre d={d} />
        <p>These terms apply when you apply to list a business on TLGB and while you are a member. They sit alongside the <Link href="/legal/terms">website terms</Link>, the <Link href="/legal/acceptable-use">acceptable use policy</Link> and our <Link href="/legal/privacy">privacy notice</Link>. You confirm that you are acting for a business and have authority to agree to these terms for it.</p>

        <h2>2. Applying and our checks</h2>
        <p>When you apply, you must give accurate information and current documents, including your public liability insurance certificate and any accreditations you want shown. We check applications by hand and may approve or refuse any application. We may ask for more information at any time.</p>
        <p>You must keep your details up to date, and tell us promptly if your insurance or an accreditation ends, lapses or is suspended. When you change certain details, we check them again; your listing stays live meanwhile unless there is a problem.</p>

        <h2>3. What membership includes</h2>
        <p>Membership gives you a verified listing in search, the full leads feed, jobs posted by main contractors, the supply chain finder, the help board, the compliance pack, the PQQ answer bank, the payment tracker and our document templates, as described on the website at the time. Features may change over time; if we remove a major feature, you may cancel and we will refund the unused part of your fee.</p>

        <h2>4. Fees, renewal and payment</h2>
        <ul>
          <li>Membership is a yearly subscription. The price depends on your turnover band and is shown before you pay. Prices include VAT only where stated.</li>
          <li>You pay by card through our payment provider, Stripe. We never see or store your full card details.</li>
          <li>Your membership renews automatically each year on the same date unless you cancel. We will remind you before renewal.</li>
          <li>We may change prices for future years. We will tell you at least 30 days before your renewal, and you can cancel before the new price applies.</li>
          <li>If a payment fails, we will try again and email you. If it is still unpaid, your listing shows as &ldquo;Unverified&rdquo; and member tools stop until it is paid.</li>
          <li>If you correctly told us you are in a lower turnover band, you pay that band&rsquo;s price. If your turnover moves into a higher band, please update it before your next renewal.</li>
        </ul>
        <p>Founding members who were offered free membership keep the features they had at the time free for as long as that offer says.</p>

        <h2>5. Cancelling</h2>
        <p>You can cancel at any time from &ldquo;Manage billing&rdquo; on your listing page, or by emailing <Mail d={d} />. Your membership then runs until the end of the year you have paid for and does not renew. Because this is a business service, there is no statutory cooling-off period, and we do not refund part years unless these terms say otherwise or the law requires it.</p>
        <p>When your membership ends, your listing shows as &ldquo;Unverified&rdquo; and is hidden from searches for verified members. Your compliance pack documents are deleted 90 days after your membership ends, so download anything you need before then. You can ask us to remove your listing entirely at any time.</p>

        <h2>6. Your compliance pack, PQQ answers and share links</h2>
        <ul>
          <li>You are responsible for what you upload and share, and for making sure it is accurate and current.</li>
          <li>Documents can contain personal data about your staff, for example training records or site cards. Only upload what you are entitled to share, and keep it to what contractors need.</li>
          <li>Project references can include your clients&rsquo; contact details. Only add them if you have that person&rsquo;s agreement to be contacted as a referee.</li>
          <li>Anyone with a share link can see what you chose to include until the link expires or you switch it off. You can see when links are opened and switch them off at any time.</li>
          <li>We check insurance and accreditation certificates in your pack before contractors see them. Other documents are shown as you supplied them.</li>
          <li>Templates are a starting point and must be checked by a competent person. You remain responsible for your own policies, risk assessments and method statements.</li>
        </ul>

        <h2>7. Jobs from main contractors</h2>
        <p>If your listing matches a job posted by a main contractor, we email you about it. You can turn these emails off on your listing page. Contractors can also invite you to price directly. When you reply to a job, the contractor sees your business name, contact details and listing, plus your compliance pack and company profile if you choose to attach them. Any quote, contract or dispute is between you and the contractor.</p>

        <h2>8. Ending or suspending a listing</h2>
        <p>We may suspend or remove a listing, without refund, if you give false or misleading information or documents, if your insurance lapses and is not renewed, if you seriously or repeatedly break these terms or the acceptable use policy, or if we receive credible evidence of conduct that puts others at risk. Where it is reasonable to do so, we will tell you why and give you a chance to put things right.</p>

        <h2>9. Liability</h2>
        <p>The liability section of the <Link href="/legal/terms">website terms</Link> applies. In particular, we do not guarantee that membership will win you any work.</p>
      </>
    ),
  },

  // -----------------------------------------------------------------
  {
    slug: 'contractor-terms',
    title: 'Contractor terms',
    summary: 'For main contractors, housebuilders and developers using a contractor account.',
    body: (d) => (
      <>
        <h2>1. These terms</h2>
        <WhoWeAre d={d} />
        <p>These terms apply to main contractor accounts. They sit alongside the <Link href="/legal/terms">website terms</Link>, the <Link href="/legal/acceptable-use">acceptable use policy</Link> and our <Link href="/legal/privacy">privacy notice</Link>. The person who creates the account confirms that they work for the company and can agree to these terms for it.</p>

        <h2>2. Your account</h2>
        <ul>
          <li>Contractor accounts are free. We check each company against Companies House and confirm the person signing up works there before the company can post jobs. We may refuse or suspend any account.</li>
          <li>Owners on your account can add and remove colleagues. Only add people who work for your company, and remove people who leave. You are responsible for what everyone on your account does.</li>
          <li>Your shortlist, lists, notes and jobs are shared by everyone on your account. Notes are private to your company, but write them on the basis that the business concerned could ask to see personal data about themselves.</li>
        </ul>

        <h2>3. Posting jobs</h2>
        <ul>
          <li>Only post genuine work packages your company intends to let, with an honest description of the scope, location and timing. No adverts, recruitment posts, or requests designed to collect prices with no intention of letting the work.</li>
          <li>When you send a job, we email the members who match its trade, area and requirements. You can also invite trades on your shortlist; they can reply even if they are not paying members.</li>
          <li>Jobs and their drawings are visible to paying members and anyone you invite. Do not upload anything you are not allowed to share, or anything confidential beyond what bidders need.</li>
          <li>Close jobs once they are let or cancelled. We delete jobs, with their drawings and replies, two years after they were last updated.</li>
        </ul>

        <h2>4. Replies and paperwork</h2>
        <p>Trades who reply may attach a link to their compliance pack and company profile. Use what they share only to assess them for your work, keep it secure, and do not pass it on except to colleagues and professional advisers who need it for that purpose. Links can expire or be switched off by the trade.</p>
        <p>Paperwork status shown on your shortlist reflects the documents we have checked. It is not a guarantee, and you remain responsible for your own pre-qualification and the checks your clients and the law require of you, including under the Construction (Design and Management) Regulations 2015.</p>

        <h2>5. No commission, no agency</h2>
        <p>We do not charge commission on work, are not a party to any contract between you and a trade, and do not act as an agent for either side. Any enquiry, tender, contract, payment or dispute is between you and the trade.</p>

        <h2>6. Future paid features</h2>
        <p>Contractor accounts are free today. We may introduce optional paid features or plans in future. If we do, we will tell you at least 30 days in advance, nothing will be charged without your agreement, and companies that joined before then keep the features they have today for free.</p>

        <h2>7. Liability</h2>
        <p>The liability section of the <Link href="/legal/terms">website terms</Link> applies. As the contractor service is free, our total liability to you in any 12 months is limited to £100, except for anything that cannot be limited by law.</p>
      </>
    ),
  },

  // -----------------------------------------------------------------
  {
    slug: 'privacy',
    title: 'Privacy notice',
    summary: 'What personal data we hold, why, who sees it, how long we keep it and your rights.',
    body: (d) => (
      <>
        <h2>1. Who we are</h2>
        <WhoWeAre d={d} />
        <p>We are the controller of the personal data described here, under the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.{d.ico ? <> We are registered with the Information Commissioner&rsquo;s Office, number {d.ico}.</> : null} For anything about your data, email <Mail d={d} />.</p>
        <p>TLGB is a business service, so most information we hold is about businesses. It becomes personal data where it identifies a person, for example a sole trader, a named contact, or a work email address.</p>

        <h2>2. What we collect, and why</h2>
        <h3>Trades and suppliers who list with us</h3>
        <ul>
          <li><strong>Application and listing details:</strong> business name and type, contact name, email, phone, website, address and base postcode, area covered, trades, turnover band, Companies House details, and for sole traders the owner&rsquo;s name and a letterhead. <em>Why:</em> to check you and run your listing (contract), and to keep the directory reliable (legitimate interests).</li>
          <li><strong>Insurance and accreditation certificates, and photos of your work.</strong> <em>Why:</em> to verify the claims on your listing (contract and legitimate interests).</li>
          <li><strong>Compliance pack documents, PQQ answers and project references</strong> that you choose to add. These can include personal data about your staff (for example training records) and your referees. <em>Why:</em> to store and share them as you instruct (contract). You are responsible for having the right to share them.</li>
          <li><strong>Payment tracker records</strong> you choose to add: jobs, contractors and their contacts, applications, amounts, dates and retentions. <em>Why:</em> to work out deadlines, send your alerts and prepare your letters (contract).</li>
          <li><strong>Membership and payment records:</strong> plan, status, renewal dates and Stripe customer references. Card details are handled by Stripe, not us. <em>Why:</em> contract, and keeping accounting records (legal obligation).</li>
        </ul>
        <h3>Main contractors</h3>
        <ul>
          <li><strong>Account details:</strong> company name, Companies House details, website, phone, and each user&rsquo;s name, job title and work email. <em>Why:</em> to check the company and run the account (contract and legitimate interests).</li>
          <li><strong>Shortlists, notes, jobs, drawings, invitations and replies.</strong> <em>Why:</em> to provide the service (contract).</li>
        </ul>
        <h3>Everyone</h3>
        <ul>
          <li><strong>Login records:</strong> your email address and secure, one-way scrambled copies of login links and session tokens. <em>Why:</em> to let you log in securely (contract and legitimate interests).</li>
          <li><strong>Things you send us:</strong> enquiries, accreditation help requests, supplier suggestions, help board posts and job reports. <em>Why:</em> to deal with them (legitimate interests).</li>
          <li><strong>Share link activity:</strong> when a compliance pack link is opened or a document downloaded, we record the time so the member can see it. <em>Why:</em> legitimate interests of the member and of us in keeping shared documents secure.</li>
          <li><strong>Technical logs:</strong> our hosting provider keeps short-term server logs, which include IP addresses, for security and fault finding (legitimate interests).</li>
        </ul>
        <p>Where we rely on legitimate interests, we have weighed them against your rights. You can ask us for details, and you can object (see section 7).</p>

        <h2>3. What is public</h2>
        <p>A member&rsquo;s listing is public: business name, trades, contact name, phone, email, website, base postcode and area covered, photos, and a summary of checked insurance and accreditations. Jobs posted by contractors are visible in summary to the public and in full to members and invited trades. Help board posts are visible to logged-in members. Compliance packs are private and only seen through share links the member creates or attaches to a reply.</p>

        <h2>4. Emails we send</h2>
        <p>We send emails needed to run your account: login links, application decisions, renewal and expiry reminders, document check results, replies to your jobs and, for members, jobs from main contractors that match your listing. Members can turn job emails off on their listing page. We do not send marketing emails or sell or share your details for others&rsquo; marketing. If we start sending newsletters, we will only do so as the law allows and you will be able to opt out.</p>

        <h2>5. Who we share it with</h2>
        <p>We use these service providers, who act on our instructions under data processing terms:</p>
        <ul>
          <li><strong>Vercel</strong> (website hosting and server logs)</li>
          <li><strong>Supabase</strong> (database and file storage)</li>
          <li><strong>Twilio SendGrid</strong> (sending emails)</li>
          <li><strong>Stripe</strong> (taking payments; Stripe is also a controller for some payment and fraud-prevention data, under its own privacy notice)</li>
          <li><strong>Companies House</strong> and <strong>postcodes.io</strong> (we send a company number or a postcode to look up public records)</li>
        </ul>
        <p>We also share information with other users as the service is designed to: contractors see the details of trades who reply to them, and anyone with a member&rsquo;s share link sees what that link includes. We may share information if the law requires it, to protect people from fraud or harm, or with professional advisers. If TLGB or its business is ever sold, the buyer would take on this notice.</p>

        <h2>6. Where it is stored</h2>
        <p>Some of our providers are based in, or use servers in, the United States. Where personal data is transferred outside the UK, it is protected by UK adequacy regulations (including the UK Extension to the EU-US Data Privacy Framework where the provider is certified) or by the UK International Data Transfer Agreement or Addendum.</p>

        <h2>7. How long we keep it</h2>
        <ul>
          <li>Compliance pack documents: deleted automatically 90 days after a paid membership ends, or straight away when you delete them.</li>
          <li>Contractor jobs, drawings, invitations and replies: deleted automatically two years after the job was last updated.</li>
          <li>Login links: expire after 30 minutes. Sessions: expire after 30 days. Both are then deleted.</li>
          <li>Listings and contractor accounts: kept while active, and for up to two years after they end so we can deal with questions, then deleted or anonymised. You can ask us to delete them sooner.</li>
          <li>Payment and invoice records: six years, as required for tax.</li>
          <li>Payment tracker jobs and applications: kept until you delete them, or two years after your membership ends.</li>
          <li>Enquiries and messages: up to two years.</li>
        </ul>

        <h2>8. Your rights</h2>
        <p>You have the right to ask for a copy of your personal data, to have it corrected, deleted or restricted, to object to our use of it, and to receive it in a portable format. Most details can be corrected yourself from your listing or account. To use any right, email <Mail d={d} />. We will reply within one month. Some rights have limits, for example where we must keep records by law.</p>
        <p>Matching jobs to members is automatic, but it does not produce decisions with legal or similarly significant effects; contractors decide who they work with.</p>
        <p>If you are unhappy with how we handle your data, please tell us first. You can also complain to the Information Commissioner&rsquo;s Office at <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noopener">ico.org.uk</a> or on 0303 123 1113.</p>

        <h2>9. Security</h2>
        <p>Data is sent over encrypted connections. Documents are stored privately and only opened through short-lived links. We store only scrambled versions of login links and sessions, and staff access is limited to those who need it.</p>

        <h2>10. Cookies</h2>
        <p>See our <Link href="/legal/cookies">cookie policy</Link>.</p>
      </>
    ),
  },

  // -----------------------------------------------------------------
  {
    slug: 'cookies',
    title: 'Cookie policy',
    summary: 'The one cookie we use, and why you are not asked to accept cookies.',
    body: (d) => (
      <>
        <h2>The short version</h2>
        <p>We use one cookie, and only when you log in. It is strictly necessary to keep you logged in, so the law does not require us to ask for your consent and we do not show a cookie banner. We do not use analytics, advertising or tracking cookies.</p>

        <h2>Cookies on tlgb.co.uk</h2>
        <table className="table">
          <thead><tr><th>Name</th><th>What it does</th><th>How long</th></tr></thead>
          <tbody>
            <tr><td><code>tlgb_session</code></td><td>Keeps you logged in after you use a login link. It holds a random code, not your details, and cannot be read by scripts on the page.</td><td>30 days, or until you log out</td></tr>
          </tbody>
        </table>

        <h2>Other services</h2>
        <p>When you pay for membership, you are taken to Stripe&rsquo;s secure payment page. Stripe sets its own cookies there for payment security and fraud prevention, under <a href="https://stripe.com/gb/legal/cookies-policy" target="_blank" rel="noopener">Stripe&rsquo;s cookie policy</a>. Links to other websites, such as tender notices and council planning pages, take you to sites with their own cookie policies.</p>

        <h2>Our emails</h2>
        <p>Our emails do not contain tracking pixels, and links in them are not rewritten to track clicks.</p>

        <h2>Changes</h2>
        <p>If we ever add cookies that are not strictly necessary, such as analytics, we will ask for your consent first and update this page. Questions: <Mail d={d} />.</p>
      </>
    ),
  },

  // -----------------------------------------------------------------
  {
    slug: 'acceptable-use',
    title: 'Acceptable use policy',
    summary: 'What you must not do on the site.',
    body: (d) => (
      <>
        <p>This policy applies to everyone using TLGB, alongside the <Link href="/legal/terms">website terms</Link>. If you break it, we may remove content, suspend or close accounts, and report illegal activity.</p>
        <h2>You must not</h2>
        <ul>
          <li>give false or misleading information or documents, including insurance or accreditation certificates, or pretend to be another person or business;</li>
          <li>post fake, misleading or speculative jobs, or jobs for work you do not intend to let;</li>
          <li>copy, scrape or harvest listings, contact details, leads or other content in bulk, by automated means or otherwise;</li>
          <li>use contact details from the website to send spam, unsolicited marketing or bulk messages; contact listed businesses only about genuine enquiries;</li>
          <li>upload anything you do not have the right to share, including other people&rsquo;s personal data without a lawful reason, or confidential documents you are not allowed to pass on;</li>
          <li>post anything unlawful, defamatory, discriminatory, threatening, abusive or offensive;</li>
          <li>share someone&rsquo;s compliance pack link, documents or PQQ answers beyond the purpose they were shared for;</li>
          <li>try to get around login, share-link or membership controls, test our security without permission, or upload viruses or harmful code;</li>
          <li>overload, disrupt or interfere with the website or other users;</li>
          <li>resell or republish our content or data, or use it to build a competing directory.</li>
        </ul>
        <h2>Reporting</h2>
        <p>To report a listing, job or post that breaks this policy, use the report option where there is one, or email <Mail d={d} />.</p>
      </>
    ),
  },

  // -----------------------------------------------------------------
  {
    slug: 'complaints',
    title: 'Complaints procedure',
    summary: 'How to raise a complaint and what happens next.',
    body: (d) => (
      <>
        <p>We want to put things right if something has gone wrong. This procedure covers complaints about our service, our checks, a listing, a job post, billing or how we have handled your data.</p>
        <h2>How to complain</h2>
        <p>Email <Mail d={d} /> with &ldquo;Complaint&rdquo; in the subject. Tell us who you are, what happened, any listing or job it relates to, and what you would like us to do.</p>
        <h2>What happens next</h2>
        <ol>
          <li>We acknowledge your complaint within 5 working days.</li>
          <li>We look into it, which may include asking you or another business for more information.</li>
          <li>We give you a full reply within 20 working days. If we need longer, we will tell you why and when to expect it.</li>
          <li>If you are not happy with our reply, ask for it to be reviewed by one of the partners who run TLGB, who were not involved in the first reply. They will respond within a further 20 working days.</li>
        </ol>
        <h2>Complaints about another business</h2>
        <p>We cannot settle disputes about work, quotes, payments or contracts between businesses, as we are not a party to them. If you have evidence that a business gave us false information, or no longer meets our checks, we will investigate and may suspend or remove its listing.</p>
        <h2>Data protection complaints</h2>
        <p>You can also complain to the Information Commissioner&rsquo;s Office at <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noopener">ico.org.uk</a>. See our <Link href="/legal/privacy">privacy notice</Link>.</p>
      </>
    ),
  },
];
