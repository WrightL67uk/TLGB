// "How to" guides for every part of the site. Rendered by app/guides/[slug]/page.tsx.
// Links inside text use [words](/path). Keep wording plain: no jargon, no em dashes.

export type HowToSection = { h: string; p?: string[]; steps?: string[]; list?: string[]; tip?: string };
export type HowTo = {
  slug: string;
  group: 'start' | 'trades' | 'contractors' | 'suppliers' | 'seekers';
  title: string;
  summary: string;
  intro: string;
  sections: HowToSection[];
  cta?: { label: string; href: string }[];
};

export const GROUPS: { key: HowTo['group']; title: string; blurb: string }[] = [
  { key: 'start', title: 'Getting started', blurb: 'Joining, getting verified and logging in.' },
  { key: 'trades', title: 'Member tools for trades', blurb: 'How to use each tool that comes with membership.' },
  { key: 'contractors', title: 'For main contractors', blurb: 'Free accounts for finding, checking and managing landscaping trades.' },
  { key: 'suppliers', title: 'For suppliers', blurb: 'Free listings, and price requests from our members.' },
  { key: 'seekers', title: 'For people looking for work', blurb: 'A free profile that employers in the industry can find.' },
];

export const HOW_TOS: HowTo[] = [
  {
    slug: 'getting-listed',
    group: 'start',
    title: 'Getting listed and verified',
    summary: 'How to apply, what we check, what membership includes and how to keep your Verified badge.',
    intro: 'Every business on The Little Green Book is checked by hand before it goes live. This is what happens from application to Verified badge.',
    sections: [
      {
        h: 'Apply',
        steps: [
          'Go to [list your business](/join) and fill in the five short sections: your business, contact details, what you do and where, insurance and accreditations, and your work.',
          'Limited companies: enter your company number and we look you up on Companies House. Sole traders: upload a letterhead with your business name and address.',
          'Upload your public liability certificate, and employers liability if you have staff. Add any accreditations you hold (CHAS, SMAS, Constructionline, BALI and so on) with their certificates.',
          'Add a few photos and a short description. Listings with photos get more attention from contractors.',
        ],
      },
      {
        h: 'What we check',
        list: [
          'The company is real and active (Companies House, or your letterhead for sole traders).',
          'Your insurance certificate matches your business, the cover you entered and the expiry date.',
          'Each accreditation certificate is current and in your name.',
        ],
        p: ['If something does not match we email you to explain, so you can fix it and send it back.'],
      },
      {
        h: 'Membership',
        p: [
          'Once approved, start your yearly membership from your listing page. Founding members are free. Membership unlocks the leads, jobs from main contractors and every member tool in these guides.',
          'Your listing shows a green Verified badge while your membership is paid and your insurance is in date. If either lapses, it shows as Unverified, and main contractors who have shortlisted you are told.',
        ],
      },
      {
        h: 'Keeping it verified',
        list: [
          'We email you before insurance or an accreditation runs out.',
          'Upload the renewed certificate from your listing page. We check it and your listing updates.',
          'Expired accreditations drop off your listing automatically, so it never shows something you no longer hold.',
        ],
      },
      {
        h: 'Logging in',
        p: ['There are no passwords. Go to [log in](/login), enter your email and we send you a link that works once for 30 minutes.'],
        tip: 'Link not arrived? Check your junk or spam folder, and the Other or Updates tab. Outlook and Hotmail can be slow with new senders. Mark it as not junk and add admin@tlgb.co.uk to your safe senders.',
      },
    ],
    cta: [{ label: 'list your business', href: '/join' }, { label: 'log in', href: '/login' }],
  },

  {
    slug: 'compliance-pack',
    group: 'trades',
    title: 'Your compliance pack',
    summary: 'Keep insurance, accreditations, RAMS and policies in one place and send them to contractors with one link.',
    intro: 'Every main contractor asks for the same paperwork. The compliance pack keeps it all in one place, checked and in date, so you send a link instead of hunting for attachments.',
    sections: [
      {
        h: 'Fill it in',
        steps: [
          'Open [your compliance pack](/account/compliance) from your listing page.',
          'Your checked insurance and accreditations are already there from your listing.',
          'Upload the rest: RAMS, COSHH, policies, company details and a bank letter. Where you have nothing yet, press "Use our template" to download a Word version with your company name filled in.',
          'Set a review date on documents that need one. We remind you when each is due.',
        ],
      },
      {
        h: 'Send it to a contractor',
        steps: [
          'Create a share link and name it after the contractor or job.',
          'Send the link. It always shows your latest documents, so you never send an out of date certificate again.',
          'See when it was opened and what was downloaded. Switch the link off when the job ends.',
        ],
        p: ['Contractors can also download everything in one zip. If you have added your team, the pack shows your training matrix too, without card numbers.'],
      },
      {
        h: 'The ten templates',
        p: ['Health and safety policy, RAMS for soft landscaping and tree planting, COSHH, environmental, quality, modern slavery, equality, data protection, carbon reduction plan and training matrix. Read them through and adjust them to how you work before you use them.'],
      },
    ],
    cta: [{ label: 'open my compliance pack', href: '/account/compliance' }],
  },

  {
    slug: 'team-training',
    group: 'trades',
    title: 'Team and training records',
    summary: 'Record every card and ticket your team holds, get reminders before they expire and download a training matrix.',
    intro: 'Site managers will turn people away at the gate for an expired card. This keeps track of every card your team holds and tells you before anything runs out.',
    sections: [
      {
        h: 'Add your team',
        steps: [
          'Open [team and training](/account/team) from your listing page.',
          'Add each person with their role.',
          'Add their cards and tickets: CSCS or LISS, CPCS, NPORS, PA1 and PA6, chainsaw, SSSTS or SMSTS, first aid, street works, IPAF and PASMA, and about 20 more. Enter the pass date and we work out the expiry where the card has a set life.',
        ],
      },
      {
        h: 'Reminders',
        p: ['We email you 60 days and 30 days before a card expires, and again on the day it does, so there is time to book the course.'],
      },
      {
        h: 'Training matrix',
        p: [
          'Download a colour-coded training matrix in Word at any time, showing everyone and what they hold. Contractors often ask for one at prequalification.',
          'Your PQQ answer bank uses these records to answer the "cards and qualifications" questions for you.',
        ],
        tip: 'Tell your staff you keep their training records here. Our privacy notice covers it, but it is good practice.',
      },
    ],
    cta: [{ label: 'open team and training', href: '/account/team' }],
  },

  {
    slug: 'pqq-answer-bank',
    group: 'trades',
    title: 'PQQ answer bank and project references',
    summary: 'Answer each prequalification question once, then copy it into every portal and questionnaire.',
    intro: 'Supplier portals and PQQs ask the same questions over and over. Write the answers once here and reuse them.',
    sections: [
      {
        h: 'Build your answers',
        steps: [
          'Open the [PQQ answer bank](/account/pqq) from your listing page.',
          'Some answers fill in by themselves from your listing: company details, insurance, accreditations and your team’s cards.',
          'Work through the rest. Each question has starter wording to edit, so you are never facing a blank box.',
        ],
      },
      {
        h: 'Project references',
        p: ['Add past jobs with the client, value, dates, scope and a referee. Contractors nearly always ask for two or three similar jobs, and here you can pick the closest ones in seconds.'],
      },
      {
        h: 'Use them',
        list: [
          'Copy an answer straight into a portal or questionnaire.',
          'Download everything as a Word company profile to send with a tender or an introduction email.',
          'We remind you once a year to check your answers are still right.',
        ],
      },
    ],
    cta: [{ label: 'open my answer bank', href: '/account/pqq' }, { label: 'winning tenders guide', href: '/guides/winning-tenders' }],
  },

  {
    slug: 'payment-tracker',
    group: 'trades',
    title: 'Payment tracker',
    summary: 'Log your applications and get warned about every Construction Act deadline, late payment and retention due.',
    intro: 'Most payment disputes are lost on dates: a missed pay less notice, or a late payment nobody chased. The tracker works out every date for you.',
    sections: [
      {
        h: 'Set up a job',
        steps: [
          'Open the [payment tracker](/account/payments) from your listing page.',
          'Add the job and its payment terms from your subcontract: when you apply, how many days to the due date and the final date, and the retention percentage and release points.',
          'Log each application as you send it.',
        ],
      },
      {
        h: 'What it does for you',
        list: [
          'Works out the due date, payment notice, pay less notice, final date for payment and when you could suspend, allowing for bank holidays.',
          'Flags a missed payment notice, which can make your application the sum due.',
          'Warns you when a payment is late and works out statutory interest.',
          'Tracks retention held on every job and tells you when each half is due back.',
          'Emails you a daily summary when something needs doing.',
        ],
      },
      {
        h: 'Letters in one click',
        p: ['Download a Word letter filled in from the job: payment application, notice of sum due, notice of intention to suspend, late payment interest claim and retention release request.'],
        tip: 'Not a member? The [payment dates calculator](/tools/payment-dates) is free and works out the dates for a single application.',
      },
    ],
    cta: [{ label: 'open my payment tracker', href: '/account/payments' }, { label: 'the retention ban', href: '/guides/retention-ban' }],
  },

  {
    slug: 'price-requests',
    group: 'trades',
    title: 'Price requests to suppliers',
    summary: 'Send one plant or materials list to several suppliers and compare every quote side by side.',
    intro: 'Instead of ringing round four nurseries with the same schedule, send it once. Suppliers price it online and you see every quote on one page.',
    sections: [
      {
        h: 'Send a request',
        steps: [
          'Open [price requests](/account/quotes) from your listing page and press "New price request".',
          'Add a reference, the delivery postcode, when you need it on site and when you want prices by.',
          'Add your list. Pick plant names and sizes from the suggestions so every supplier prices the same thing, or press "Paste a list" and paste rows from a planting schedule or spreadsheet, such as "3 Acer palmatum 10L".',
          'Materials work too: topsoil, mulch, turf, seed, tree pit kits, fencing and paving, by m², m³, tonne or item.',
          'We show the suppliers who stock it and deliver there, with their ratings. Up to six can be ticked. Press send.',
        ],
      },
      {
        h: 'Compare and accept',
        list: [
          'We email you each time a supplier sends prices, and again at the deadline.',
          'The comparison shows every line side by side, with the cheapest price on each line highlighted, delivery, the total, missing items, alternatives offered, lead time and how long prices are valid.',
          'Press Accept under the one you want. That supplier gets your contact details to confirm the order, and the others are told.',
          'Nobody replied? Send it to more suppliers from the same page.',
        ],
      },
      {
        h: 'After delivery',
        p: ['Rate the supplier from the request page. Ratings show on the supplier directory and help other members choose.'],
        tip: 'Suppliers see your business name and delivery area, but not your phone or email until you accept their price. The order, payment and delivery are between you and the supplier.',
      },
    ],
    cta: [{ label: 'start a price request', href: '/account/quotes' }, { label: 'browse suppliers', href: '/suppliers' }],
  },

  {
    slug: 'member-website',
    group: 'trades',
    title: 'Your free website',
    summary: 'Publish a three-page website at yourname.tlgb.co.uk, written from your listing, with an enquiry form.',
    intro: 'Every paying member can have a website at their own tlgb.co.uk address. We write it from your listing, you check it and publish it.',
    sections: [
      {
        h: 'Make it',
        steps: [
          'Open [your website](/account/website) from your listing page.',
          'Pick your address, such as greenscapes.tlgb.co.uk, and your colours, then press "Make my website".',
          'We write the headline, introduction, about section, services and reasons to choose you from your listing, and use your listing photos.',
        ],
      },
      {
        h: 'Check it and publish',
        list: [
          'Press Preview to see the site as visitors will. It has a home page, a services and work page with your photos, and a contact page.',
          'Change any wording, pick the main photo, and choose whether to show your phone number and email.',
          'Not keen on the wording? Press "Rewrite the wording for me" for a fresh version from your listing.',
          'Press Publish. You can edit, take it offline and republish at any time.',
        ],
      },
      {
        h: 'Enquiries',
        p: ['The contact page has a quote form. Each enquiry is emailed to you, and replying goes straight to the person who asked. They are also listed on your website page with your visit and enquiry counts.'],
        tip: 'Add more photos and keep your description up to date on your listing. They feed straight into your website. Your checked accreditations and insurance show automatically, with a link to your Verified listing.',
      },
      {
        h: 'Good to know',
        list: [
          'Your site is live while your membership is active and your listing is approved.',
          'You are responsible for what it says, and for having the right to use your photos.',
        ],
      },
    ],
    cta: [{ label: 'open my website', href: '/account/website' }],
  },

  {
    slug: 'jobs-from-contractors',
    group: 'trades',
    title: 'Jobs from main contractors',
    summary: 'How matching jobs reach you, how to reply with your paperwork and how invitations work.',
    intro: 'Main contractors post landscaping and external works packages on The Little Green Book. Members whose listing matches hear about them first.',
    sections: [
      {
        h: 'How jobs reach you',
        list: [
          'When a contractor posts a package, we email every paying member whose trades, area, insurance level and accreditations match what they asked for.',
          'A contractor can also invite you directly from their shortlist. Invitations always come through.',
          'Everyone can see a summary of open jobs on the [jobs page](/jobs). Members see the full details and drawings.',
        ],
      },
      {
        h: 'Reply',
        steps: [
          'Open the job from the email or the jobs page.',
          'Add a short message: when you could start and anything you need to know.',
          'Attach your compliance pack, so the contractor sees your checked paperwork straight away.',
        ],
      },
      {
        h: 'Turning emails off',
        p: ['Too many? Switch job emails off on your listing page. Invitations from contractors still come through.'],
        tip: 'The better your listing, the more you match. Keep your trades, the distance you travel, your insurance and your accreditations up to date.',
      },
    ],
    cta: [{ label: 'see open jobs', href: '/jobs' }, { label: 'finding leads guide', href: '/guides/finding-leads' }],
  },

  {
    slug: 'help-hub-and-recruitment',
    group: 'trades',
    title: 'Help Hub and recruitment',
    summary: 'Ask other trades for labour, machines or cover, offer spare capacity, and find people looking for work.',
    intro: 'Two ways to find help when a job needs more hands.',
    sections: [
      {
        h: 'Help Hub',
        steps: [
          'Go to the [Help Hub](/help-hub). Paying members can post and see who posted each request.',
          'Post what you need: extra hands or a gang, a package to subcontract, help finishing a job, a machine or operator, or holiday cover. Or post spare capacity.',
          'Add where and when. Other members get in touch with you directly.',
        ],
      },
      {
        h: 'Recruitment',
        list: [
          'The [Recruitment](/recruitment) page lists people looking for work in landscaping and external works: their role, skills, cards and licences, vehicle and tools, availability and pay expectations.',
          'Filter by skill, card, distance and "available now".',
          'Anyone can browse. Paying members see names and contact details.',
        ],
        tip: 'We do not check what job seekers write, and we are not an employment agency. Make your own checks, including right to work, before taking anyone on.',
      },
    ],
    cta: [{ label: 'Help Hub', href: '/help-hub' }, { label: 'recruitment', href: '/recruitment' }],
  },

  {
    slug: 'main-contractors',
    group: 'contractors',
    title: 'Using TLGB as a main contractor',
    summary: 'Find and check landscaping trades, keep shortlists, get paperwork alerts and post packages. Free.',
    intro: 'A free account for main contractors and housebuilders who need reliable landscaping and external works subcontractors.',
    sections: [
      {
        h: 'Open an account',
        steps: [
          'Sign up at [main contractors](/contractors) with your company number and work email.',
          'We check the company on Companies House and confirm your email matches the company before approving the account.',
          'Add colleagues from the team page so everyone shares the same lists and notes.',
        ],
      },
      {
        h: 'Find and check trades',
        list: [
          'Search by trade and postcode, with filters for verified members, minimum public liability cover and accreditations.',
          'Each listing shows checked insurance and accreditations with expiry dates.',
          'Save trades to named shortlists, for example by region or package, and keep private notes your team can see.',
        ],
      },
      {
        h: 'Paperwork alerts',
        p: ['Your shortlist shows live paperwork status for every trade on it. Switch on alerts and we email a daily summary when a shortlisted trade’s insurance or accreditation is due to expire in the next 14 days, has expired, has been renewed, or their membership has lapsed.'],
      },
      {
        h: 'Post a package',
        steps: [
          'Post the job: trades, postcode, value band, dates, minimum cover, accreditations required and drawings.',
          'It goes to every matching member, and you can invite your shortlisted trades directly.',
          'Replies arrive with each trade’s compliance pack attached.',
        ],
      },
      {
        h: 'Labour',
        p: ['Approved contractors can see names and contact details on the [Recruitment](/recruitment) page.'],
      },
    ],
    cta: [{ label: 'open a free account', href: '/contractors' }, { label: 'find a trade', href: '/search' }],
  },

  {
    slug: 'suppliers',
    group: 'suppliers',
    title: 'For suppliers: listing and price requests',
    summary: 'Get on the supplier directory for free, and receive price requests from checked landscaping firms.',
    intro: 'Nurseries, merchants, soil and turf producers, fencing, paving and landscape product suppliers can list for free and receive real enquiries from our members.',
    sections: [
      {
        h: 'Get listed',
        steps: [
          'Fill in the form at [list your supply business](/suppliers/add): what you supply, where you are and whether you deliver nationally.',
          'Tick "Send us price requests" if you would like to receive them.',
          'We check the details and email you when you are live.',
        ],
      },
      {
        h: 'Price requests',
        list: [
          'When a member’s list matches what you supply and where you deliver, we email it to you with a private link. No login or password needed.',
          'Price each line, offer an alternative where you are short, add delivery, lead time and how long prices are valid, then send. You can change prices until the deadline.',
          'Cannot supply it? Press "We cannot quote" so the buyer knows and you are not reminded.',
          'If you have not replied, we remind you on the morning of the deadline.',
          'If the member accepts your price, we email you their contact details to confirm the order. The order, payment and delivery are between you and them.',
        ],
      },
      {
        h: 'Ratings',
        p: ['Members can rate you after an order they accepted. Ratings show on your directory listing and next to your name when members pick suppliers.'],
        tip: 'Price requests are free for our founding suppliers. We will always tell you before anything is charged.',
      },
    ],
    cta: [{ label: 'list your supply business', href: '/suppliers/add' }, { label: 'supplier directory', href: '/suppliers' }],
  },

  {
    slug: 'job-seekers',
    group: 'seekers',
    title: 'For people looking for work',
    summary: 'Make a free profile so landscaping firms and main contractors can find you.',
    intro: 'If you work in landscaping, grounds maintenance, groundworks, fencing or tree work, a free profile puts you in front of the firms that hire.',
    sections: [
      {
        h: 'Make your profile',
        steps: [
          'Start at [looking for work](/looking-for-work) with your name and email. We send you a link to log in.',
          'Tick your skills, cards and licences, and say whether you have a vehicle and your own tools.',
          'Add the type of work you want (employed, self-employed, day rate, seasonal or apprenticeship), when you are available, how far you will travel and your pay range.',
          'Running a gang? Put your team size and you can be hired together.',
          'Publish it.',
        ],
      },
      {
        h: 'Who sees what',
        list: [
          'Anyone can see your profile without your name or contact details, and only the first half of your postcode.',
          'Paying members and approved main contractors can see your name and the contact details you chose to show.',
          'You can see how many times employers have viewed your profile.',
        ],
      },
      {
        h: 'Keeping it live',
        p: ['Profiles stay up for 60 days. We email you before it comes down, so you can keep it live with one click and update your availability.'],
        tip: 'Never put your date of birth, national insurance number, bank details or anything about your health on your profile.',
      },
    ],
    cta: [{ label: 'make my profile', href: '/looking-for-work' }],
  },
];

export const howTo = (slug: string) => HOW_TOS.find((h) => h.slug === slug);
