// Progress of the cash retention ban (Commercial Payments Bill). Update this file as the bill moves;
// the guide page and its "last checked" line read from here.

export const RETENTION_CHECKED = '25 October 2026';

export type Step = { date: string; title: string; text: string; done: boolean };

export const RETENTION_STEPS: Step[] = [
  { date: 'Jul to Oct 2025', title: 'Consultation', text: 'The Department for Business and Trade consulted on either banning retentions or making them be held in protected accounts.', done: true },
  { date: '24 Mar 2026', title: 'Ban announced', text: 'The government chose an outright ban on cash retentions in construction contracts, alongside a 60-day cap on payment terms and tougher late payment rules.', done: true },
  { date: '19 May 2026', title: 'Commercial Payments Bill introduced', text: 'The bill started in the House of Lords after the King’s Speech.', done: true },
  { date: '20 Oct 2026', title: 'Passed the House of Lords', text: 'Third reading in the Lords finished with no further amendments. The bill now goes to the House of Commons.', done: true },
  { date: 'Next', title: 'House of Commons', text: 'MPs debate the bill and can still change it.', done: false },
  { date: 'Then', title: 'Royal Assent', text: 'The bill becomes an Act. The retention rules still do not start until the government sets a date in regulations.', done: false },
  { date: 'Start date + 2 years', title: 'Transition ends', text: 'New retention clauses can be agreed during a two-year transition. After that, new retention clauses are void.', done: false },
  { date: 'Start date + 3 years', title: 'Transitional retentions released', text: 'Money held under clauses agreed during the transition must be released one year after the transition ends, as the bill stands.', done: false },
];

export const RETENTION_SOURCES = [
  { label: 'UK Parliament: Lords completes examination of Commercial Payments Bill (21 Oct 2026)', url: 'https://www.parliament.uk/business/news/2026/october-2026/lords-completes-examination-of-commercial-payments-bill/' },
  { label: 'Commercial Payments Bill [HL]: bill stages', url: 'https://bills.parliament.uk/bills/4128/stages' },
  { label: 'House of Lords Library briefing on the bill', url: 'https://lordslibrary.parliament.uk/research-briefings/lln-2026-0028/' },
  { label: 'CMS: the retentions ban under the microscope', url: 'https://cms.law/en/gbr/legal-updates/The-retentions-ban-under-the-microscope-a-deep-dive-into-the-Commercial-Payments-Bill' },
  { label: 'Osborne Clarke: UK government to ban construction retentions', url: 'https://www.osborneclarke.com/insights/uk-government-ban-construction-retentions-and-tighten-late-payment-rules' },
  { label: 'Clyde & Co: performance security in a retention-free industry', url: 'https://www.clydeco.com/en/insights/2026/april/rethinking-performance-security-the-implications-o' },
];

export const RETENTION_BANDS = ['Under £10k', '£10k to £50k', '£50k to £150k', 'Over £150k'];
export const RETENTION_WANTS = [
  { key: 'bond', label: 'A retention bond, so contractors release cash retentions now' },
  { key: 'defects', label: 'Defects cover I can offer contractors once retentions end' },
  { key: 'updates', label: 'Email me when the bill moves on' },
];
