import { tradePlural } from './seo';

export type Faq = { q: string; a: string };

/** Extra questions that only make sense for particular trades. */
const EXTRA: Record<string, Faq[]> = {
  arborist: [
    { q: 'Do I need permission to cut down or prune a tree?', a: 'Sometimes. Trees with a Tree Preservation Order, and trees in a conservation area, usually need consent from the local council before work starts. A good tree surgeon will check this for you, but the responsibility is yours as the owner, so ask them.' },
    { q: 'What qualifications should a tree surgeon have?', a: 'Look for recognised certificates such as NPTC or Lantra for chainsaw and climbing work, and membership of a trade body like the Arboricultural Association. Ask to see certificates and check their insurance covers tree work.' },
  ],
  fencing: [
    { q: 'Do I need permission to put up a new fence?', a: 'Often not, if the fence is under two metres high at the back or one metre next to a road, but there are exceptions, including listed buildings, conservation areas and some new estates. Check with your local council if unsure, and agree the boundary with your neighbour first.' },
  ],
  'hard-landscaping': [
    { q: 'Do I need planning permission for a patio or driveway?', a: 'Paving a front garden with a hard surface over five square metres normally needs porous (drainage-friendly) materials or planning permission. Patios at the back are usually fine unless your property is listed or in a protected area. Ask your installer and check with the council.' },
  ],
  groundworks: [
    { q: 'What does a groundworker do?', a: 'Groundworkers prepare and shape the ground for building and landscaping, including excavation, drainage, foundations, levelling and laying bases for driveways, patios and outbuildings.' },
  ],
  'garden-buildings': [
    { q: 'Do I need planning permission for a garden room or shed?', a: 'Often not, if it stays within permitted development limits for height, size and position, but a garden room used as a bedroom, or one close to a boundary, may be treated differently. Building regulations can also apply to larger or insulated buildings. Ask your supplier and check with the council.' },
  ],
  landscaper: [
    { q: 'What is the difference between a landscaper and a gardener?', a: 'Landscapers build and change gardens, with paving, decking, fencing, turfing and planting. Gardeners usually look after existing gardens through regular maintenance. Many businesses do both.' },
  ],
};

/** Questions and answers shown on each trade page, and published to search engines as FAQ data. */
export function tradeFaqs(trade: string): Faq[] {
  const plural = tradePlural(trade);
  return [
    { q: `How do I find reliable ${plural}?`, a: `Choose a business with checked insurance and accreditations, ask for at least three written quotes, and look at photos and references from recent jobs. On The Little Green Book, businesses marked Verified have had their company details, insurance and accreditations checked.` },
    { q: `What does Verified mean on The Little Green Book?`, a: `It means we have checked the company details, public liability insurance and any accreditations shown, by looking at the certificates. The badge comes off if insurance or membership lapses. Listings without the badge say they have not been checked.` },
    ...(EXTRA[trade] ?? []),
    { q: `How much do ${plural} charge?`, a: `Prices vary with the size and type of job, the materials and where you live, so there is no honest single figure. The best approach is to get several written quotes for the same work and compare what each one includes.` },
  ];
}
