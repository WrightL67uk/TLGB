// Plain advice for the public on hiring a trade. Rendered by app/advice/[slug]/page.tsx.
// Links inside text use [words](/path). Keep wording plain: no jargon, no em dashes.

export type AdviceSection = { h: string; p?: string[]; list?: string[]; steps?: string[] };
export type Advice = {
  slug: string;
  title: string;
  summary: string;
  intro: string;
  sections: AdviceSection[];
  faq: { q: string; a: string }[];
  updated: string;
};

export const ADVICE: Advice[] = [
  {
    slug: 'how-to-check-a-landscaper-is-genuine',
    title: 'How to check a landscaper is genuine',
    summary: 'Six checks that take about ten minutes and filter out most rogue traders before you invite anyone to quote.',
    intro: 'Landscaping is not a licensed trade in the UK, so anyone can put up a website and call themselves a landscaper. A few simple checks before you ask for a quote will tell you whether a business is real, insured and likely to turn up.',
    updated: '2026-11-22',
    sections: [
      {
        h: 'The six checks',
        steps: [
          'Ask for a business name and a landline or mobile number, plus a proper address. A trader who only gives a first name and a WhatsApp number is a warning sign.',
          'If they say they are a limited company, search the company number on Companies House (it is free). Check the name matches, the company is active and it has been trading for a sensible length of time.',
          'Ask to see their public liability insurance certificate, and check the name on it matches the business and that it is in date. Cover of at least £1 million is normal, and many clients ask for £2 million or £5 million.',
          'If they will have staff on your property, ask whether they hold employers liability insurance. Most employers in the UK must have it.',
          'Look for accreditations that fit the job, such as BALI for landscaping, NPTC or Lantra tickets for tree work and chainsaws, or CHAS, SMAS and Constructionline for commercial work. Ask for the certificate rather than trusting a logo.',
          'Ask for two recent customers you can phone, or photos of finished jobs, and check their reviews on more than one site.',
        ],
      },
      {
        h: 'Where The Little Green Book helps',
        p: [
          'Every business marked **Verified** on The Little Green Book has had its company details, public liability insurance and accreditations checked by us before it was listed, and the badge drops off if insurance runs out. Listings that have not been checked say so on the page.',
          '[Find a trade near you](/search) or [browse trades by area](/find).',
        ],
      },
      {
        h: 'Still unsure?',
        list: [
          'Get at least three written quotes and be cautious of any that are far cheaper than the rest.',
          'Never feel pressured into agreeing on the doorstep. A good trader is happy to let you think it over.',
          'Read [the red flags to watch for when hiring a trade](/advice/red-flags-when-hiring-a-trade).',
        ],
      },
    ],
    faq: [
      { q: 'Does a landscaper need a licence in the UK?', a: 'No. Landscaping is not a licensed trade, so there is no single register to check. That is why checking insurance, company details and accreditations yourself matters.' },
      { q: 'How can I check if a landscaping company is real?', a: 'If it is a limited company, search its company number on Companies House to confirm it is active and the name matches. Then ask for an insurance certificate and recent customer references.' },
      { q: 'What insurance should a landscaper have?', a: 'At minimum public liability insurance, commonly £1 million to £5 million of cover, and employers liability insurance if they have staff. Ask to see the certificate and check the expiry date.' },
    ],
  },
  {
    slug: 'red-flags-when-hiring-a-trade',
    title: 'Red flags when hiring a trade',
    summary: 'The warning signs that a gardener, landscaper, tree surgeon or builder may be a rogue trader.',
    intro: 'Most trades are honest and good at their job. The few who are not tend to behave in similar ways. If you spot more than one of these signs, walk away.',
    updated: '2026-11-22',
    sections: [
      {
        h: 'Warning signs',
        list: [
          'They knock on your door or phone out of the blue offering to do work, often saying they are "in the area" or have "leftover materials".',
          'They pressure you to decide today, or offer a discount that disappears if you wait.',
          'They ask for a large deposit or the full price upfront, or only accept cash.',
          'There is no written quote, or the quote is vague about what is included, materials and timings.',
          'No address, no landline, a vehicle with no business name, or a name on the insurance that does not match the name they gave you.',
          'They cannot or will not show you insurance or accreditation certificates.',
          'They say you do not need planning permission, tree consent or building regulations approval without checking, when your job might need it.',
          'The price is far lower than every other quote, or it rises during the job for reasons they did not mention first.',
        ],
      },
      {
        h: 'What to do instead',
        list: [
          'Get at least three written quotes and compare what each one covers, not only the total.',
          'Agree a payment plan in writing, with stage payments tied to work done, and keep the final payment until you are happy.',
          'Pay by card or bank transfer so you have a record, and keep all messages.',
          'Contracts agreed at your home usually come with a 14 day cancellation right, and a trader must tell you so in writing. If they do not, that is a red flag in itself.',
        ],
      },
      {
        h: 'If something goes wrong',
        p: [
          'Keep all quotes, messages and receipts. You can report a trader to Citizens Advice, which passes complaints to Trading Standards. If you paid by card, ask your card provider whether you can claim the money back.',
          'To avoid problems in the first place, see [how to check a landscaper is genuine](/advice/how-to-check-a-landscaper-is-genuine).',
        ],
      },
    ],
    faq: [
      { q: 'What are the signs of a rogue trader?', a: 'Cold calling, pressure to decide quickly, demands for large cash deposits, no written quote, no address, and no proof of insurance are the most common signs.' },
      { q: 'How much deposit should I pay a tradesperson?', a: 'It is best to keep deposits small and pay in stages as work is completed. Be wary of anyone asking for most or all of the price upfront, especially in cash.' },
      { q: 'Who do I report a rogue trader to?', a: 'In the UK you can report to Citizens Advice, which refers cases to Trading Standards. If you paid by card, also contact your card provider.' },
    ],
  },
  {
    slug: 'what-to-ask-for-in-a-trade-quote',
    title: 'What a good garden or landscaping quote should include',
    summary: 'How to compare quotes properly and what to ask for in writing before work starts.',
    intro: 'Two quotes for the same job can differ by thousands of pounds, and the cheaper one is often cheaper because it leaves things out. A good written quote makes comparison simple.',
    updated: '2026-11-22',
    sections: [
      {
        h: 'A good quote shows',
        list: [
          'The business name, address, phone number and, for limited companies, the company number.',
          'A clear description of the work, ideally with measurements, a sketch or a drawing.',
          'Materials listed with type and quality, such as the paving range, turf grade or timber treatment.',
          'What is not included, such as waste removal, skip hire, ground clearing, power or water, or making good afterwards.',
          'The total price, whether VAT is included, and how payments are split.',
          'Start date, how long the job should take, and what happens if the weather causes delays.',
          'How long the quote stays valid, and what happens if the price changes.',
        ],
      },
      {
        h: 'Questions worth asking',
        list: [
          'Will you carry out the work yourselves, or will subcontractors do it?',
          'Do you have public liability insurance, and can I see the certificate?',
          'Do you offer a guarantee on the work, and for how long?',
          'Do I need planning permission, tree consent or approval from my freeholder or neighbours?',
          'What will you do about drainage, levels and access for machines?',
        ],
      },
      {
        h: 'Comparing like with like',
        p: [
          'Put the quotes side by side and check each includes the same things. If one is much cheaper, ask them to explain exactly what is different before you decide.',
          'Use [The Little Green Book](/search) to find checked trades and ask each for a written quote.',
        ],
      },
    ],
    faq: [
      { q: 'How many quotes should I get for landscaping work?', a: 'Three is a sensible number. Ask each for the same written breakdown so you can compare materials, extras, timings and payment terms, not just the final price.' },
      { q: 'Should a quote include VAT?', a: 'It should say clearly whether the price includes VAT. Many small businesses are not VAT registered, but larger ones must add 20 percent, so check this before comparing totals.' },
      { q: 'What should a landscaping quote include?', a: 'A description of the work, materials, what is excluded, the total price and payment stages, start date and duration, and the trader\'s business and insurance details.' },
    ],
  },
  {
    slug: 'what-insurance-should-a-tradesperson-have',
    title: 'What insurance should a tradesperson have?',
    summary: 'Public liability, employers liability and why the certificate matters, explained simply.',
    intro: 'Mistakes happen on every job. Insurance decides whether you or the trader pays when they do, so it is worth checking before work starts.',
    updated: '2026-11-22',
    sections: [
      {
        h: 'Public liability insurance',
        p: [
          'Covers injury to other people and damage to property caused by the trader\'s work, for example a tree falling on a neighbour\'s fence or a digger damaging a water pipe.',
          'Cover of at least £1 million is common, and £2 million, £5 million or more is normal for larger jobs and commercial work. Ask what level they hold.',
        ],
      },
      {
        h: 'Employers liability insurance',
        p: [
          'Covers injury to the trader\'s own employees. Most businesses that employ staff must have it by law, including some part-time and temporary workers. A genuine sole trader working alone usually does not need it, but if someone helps them on your property, ask.',
        ],
      },
      {
        h: 'Checking the certificate',
        list: [
          'The name on it must match the business you are hiring.',
          'The expiry date must be in the future, and the insurance should stay valid for the full length of the job.',
          'It should cover the type of work being done. Tree work, for example, is higher risk than lawn care.',
          'You can phone the insurer or broker to confirm a policy is live if you are unsure.',
        ],
      },
      {
        h: 'Easier checking',
        p: [
          'Members of [The Little Green Book](/search) upload their certificates and we check them. A **Verified** badge means insurance was checked and in date, and it comes off if cover runs out.',
        ],
      },
    ],
    faq: [
      { q: 'What is public liability insurance for a tradesperson?', a: 'It covers injury to other people and damage to property caused by their work. Cover of £1 million to £5 million is typical for landscapers and gardeners.' },
      { q: 'Does a sole trader need employers liability insurance?', a: 'Not usually if they work completely alone, but if they employ anyone, including casual or part-time helpers, they generally must hold it. Ask before work starts.' },
      { q: 'How do I know if a trader\'s insurance is valid?', a: 'Ask for the certificate, check the business name and expiry date, and if in doubt, contact the insurer or broker named on it to confirm the policy is live.' },
    ],
  },
];

export const advice = (slug: string) => ADVICE.find((a) => a.slug === slug);
