import 'server-only';
import { tradeLabel } from './config';
import { pounds, sinceYear, type SiteBusiness, type Service } from './memberSites';

export type SiteCopy = { headline: string; intro: string; about: string; services: Service[]; reasons: string[]; areas: string; written_by: string };

/** Standard services for each trade, used when we write the site without AI. */
const TRADE_SERVICES: Record<string, Service[]> = {
  landscaper: [
    { title: 'Soft landscaping', text: 'Tree, shrub and hedge planting, turf and seeding, topsoil and mulch, set out to the landscape plan.' },
    { title: 'New-build housing', text: 'Rear gardens, frontages and public open space, phased plot by plot to suit handovers.' },
    { title: 'Trees and hedging', text: 'Standard and heavy standard trees, root ball and bare root, with tree pit systems, staking and irrigation.' },
  ],
  'hard-landscaping': [
    { title: 'Paving and patios', text: 'Natural stone, block and slab paving laid on properly prepared sub-bases.' },
    { title: 'Kerbs, edgings and walls', text: 'Kerbing, edgings, steps and garden walls built to last.' },
  ],
  'grounds-maintenance': [
    { title: 'Grounds maintenance', text: 'Grass cutting, hedge cutting, shrub bed care and litter picking on scheduled visits.' },
    { title: 'Establishment and defects care', text: 'Watering, weeding and replacements through the defects period on new schemes.' },
  ],
  arborist: [
    { title: 'Tree surgery', text: 'Crown reductions, thinning, lifting and dismantling, carried out by qualified climbers.' },
    { title: 'Tree surveys and planting', text: 'Tree removal, stump grinding and new tree planting.' },
  ],
  groundworks: [
    { title: 'Groundworks', text: 'Excavation, drainage, foundations and sub-bases for external works.' },
    { title: 'Site preparation', text: 'Clearance, levelling and soil management ready for landscaping.' },
  ],
  fencing: [
    { title: 'Fencing and gates', text: 'Timber, metal and security fencing and gates for homes, sites and public spaces.' },
    { title: 'Plot boundaries', text: 'Close board and post and rail boundaries on new-build plots, phased to suit the programme.' },
  ],
  irrigation: [{ title: 'Irrigation systems', text: 'Design, installation and servicing of irrigation for planting, lawns and green roofs.' }],
  'play-sports': [{ title: 'Play and sports surfacing', text: 'Safety surfacing, artificial grass and sports surfaces, installed and maintained.' }],
  gritting: [{ title: 'Winter maintenance', text: 'Gritting and snow clearance for car parks, footpaths and estates.' }],
  'landscape-architect': [{ title: 'Landscape architecture', text: 'Landscape design, planting plans and planning support from concept to construction.' }],
  'landscape-designer': [{ title: 'Garden and landscape design', text: 'Designs and planting plans tailored to the site and how it will be used.' }],
  nursery: [{ title: 'Plant supply', text: 'Trees, hedging, shrubs and perennials grown and supplied for landscape schemes.' }],
  supplier: [{ title: 'Materials supply', text: 'Landscaping materials supplied and delivered to site.' }],
  'plant-hire': [{ title: 'Plant and machine hire', text: 'Machines supplied with or without operators for landscaping and external works.' }],
  training: [{ title: 'Training', text: 'Courses and qualifications for landscaping and external works teams.' }],
};

/** Writes the site from the listing with no AI: plain, factual, nothing invented. */
export function writeFromListing(b: SiteBusiness): SiteCopy {
  const trades = b.trades.length ? b.trades : ['landscaper'];
  const main = tradeLabel(trades[0]).toLowerCase().replace(/ \/ .*/, '');
  const since = sinceYear(b);
  const area = b.radius_miles ? `within about ${b.radius_miles} miles of ${b.base_postcode.split(' ')[0]}` : `around ${b.base_postcode.split(' ')[0]}`;
  const services: Service[] = [];
  for (const t of trades) for (const s of TRADE_SERVICES[t] ?? []) if (services.length < 6 && !services.some((x) => x.title === s.title)) services.push(s);
  if (!services.length) services.push({ title: tradeLabel(trades[0]), text: `${tradeLabel(trades[0])} services for commercial and residential clients.` });
  const reasons: string[] = [];
  if (b.accreditations.length) reasons.push(`${b.accreditations.join(', ')} accredited, checked by The Little Green Book.`);
  if (b.pl_cover_amount) reasons.push(`${pounds(b.pl_cover_amount)} public liability insurance, checked and kept in date.`);
  if (since && since < new Date().getFullYear()) reasons.push(`Trading since ${since}.`);
  reasons.push('Paperwork ready before we start: insurance, accreditations, RAMS and training records.');
  reasons.push('A Verified member of The Little Green Book.');
  const firstSentence = (b.description ?? '').split(/(?<=\.)\s/)[0]?.trim();
  return {
    headline: `${b.trading_name.replace(/\s+(ltd|limited)$/i, '')}: ${trades.map(tradeLabel).slice(0, 2).join(' and ').toLowerCase()} you can rely on`.replace(/^./, (c) => c.toUpperCase()),
    intro: firstSentence && firstSentence.length > 30 ? firstSentence : `Professional ${main} services ${area}.`,
    about: (b.description ?? '').trim() || `${b.trading_name} provides ${trades.map(tradeLabel).join(', ').toLowerCase()} services ${area}.`,
    services,
    reasons: reasons.slice(0, 5),
    areas: `We work ${area}.`,
    written_by: 'template',
  };
}

/** Writes the site with Claude when an API key is set; falls back to the plain version. */
export async function writeSiteCopy(b: SiteBusiness): Promise<SiteCopy> {
  const key = process.env.ANTHROPIC_API_KEY;
  const base = writeFromListing(b);
  if (!key) return base;
  const facts = {
    business: b.trading_name, trades: b.trades.map(tradeLabel), description: b.description, base: b.base_postcode.split(' ')[0],
    radius_miles: b.radius_miles, accreditations: b.accreditations, public_liability: b.pl_cover_amount ? pounds(b.pl_cover_amount) : null,
    trading_since: sinceYear(b),
  };
  const prompt = `Write the wording for a small 3-page website for a UK landscaping or external works business, using ONLY these facts:
${JSON.stringify(facts, null, 2)}

Rules: British English. Plain, confident, specific, like a good tradesperson talking. No em dashes or en dashes. No clichés ("passionate", "bespoke solutions", "look no further", "transform your outdoor space"). Never invent facts: no made-up numbers, clients, awards, years, team sizes or reviews. Keep it short.

Reply with JSON only, in exactly this shape:
{"headline": "max 10 words", "intro": "one or two sentences", "about": "2 short paragraphs separated by a blank line", "services": [{"title": "2-4 words", "text": "one sentence"}], "reasons": ["short sentence"], "areas": "one sentence about where they work"}
Give 3 to 6 services and 3 to 5 reasons.`;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) { console.error('site writer: API error', res.status, await res.text()); return base; }
    const j = await res.json();
    const text: string = j.content?.map((c: { text?: string }) => c.text ?? '').join('') ?? '';
    const out = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    const clean = (s: unknown, max: number) => String(s ?? '').replace(/[–—]/g, ',').trim().slice(0, max);
    const services = Array.isArray(out.services) ? out.services.slice(0, 6).map((s: Service) => ({ title: clean(s.title, 60), text: clean(s.text, 300) })).filter((s: Service) => s.title) : [];
    const reasons = Array.isArray(out.reasons) ? out.reasons.slice(0, 5).map((r: unknown) => clean(r, 200)).filter(Boolean) : [];
    return {
      headline: clean(out.headline, 120) || base.headline,
      intro: clean(out.intro, 400) || base.intro,
      about: clean(out.about, 2000) || base.about,
      services: services.length ? services : base.services,
      reasons: reasons.length ? reasons : base.reasons,
      areas: clean(out.areas, 300) || base.areas,
      written_by: 'ai',
    };
  } catch (err) {
    console.error('site writer failed', err);
    return base;
  }
}
