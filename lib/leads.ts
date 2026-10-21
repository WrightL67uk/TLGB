import 'server-only';
import { db } from './supabase';

/**
 * Leads, all from free public sources, gathered every morning.
 *
 * Public tenders (Open Contracting Data Standard, one parser for all):
 *  - Find a Tender (UK-wide, larger contracts)        www.find-tender.service.gov.uk
 *  - Contracts Finder (England, contracts over ~£12k)  www.contractsfinder.service.gov.uk
 *  - Public Contracts Scotland                         api.publiccontractsscotland.gov.uk
 *  - Sell2Wales                                        api.sell2wales.gov.wales
 *  From these we take open tenders for our trades, upcoming tenders (planning notices) for
 *  our trades, and contract awards for building and civils jobs over £1m, because the main
 *  contractor that won will need landscaping, groundworks and fencing subcontractors.
 *
 * Planning applications, from every UK council register, via UK PlanIt (www.planit.org.uk):
 *  - medium and large developments (every one has external works and landscaping)
 *  - landscaping and tree conditions being discharged (the planting is about to happen)
 *  - tree works applications (TPO and conservation area trees)
 */

export type LeadSource = 'fts' | 'cf' | 'pcs' | 's2w' | 'planit';
export const SOURCE_LABEL: Record<LeadSource, string> = {
  fts: 'Find a Tender',
  cf: 'Contracts Finder',
  pcs: 'Public Contracts Scotland',
  s2w: 'Sell2Wales',
  planit: 'the council planning register (via UK PlanIt)',
};

export type LeadKind = 'tender' | 'pipeline' | 'award' | 'planning' | 'trees';
export const KIND_LABEL: Record<LeadKind, string> = {
  tender: 'Open tenders',
  pipeline: 'Coming up',
  award: 'Contractor wins',
  planning: 'Planning',
  trees: 'Tree works',
};

export type LeadRow = {
  source: LeadSource;
  source_id: string;
  kind: LeadKind;
  contractor: string | null;
  status: string | null;
  meta: Record<string, string>;
  title: string;
  description: string | null;
  buyer: string | null;
  postcode: string | null;
  region: string | null;
  lat: number | null;
  lng: number | null;
  value_amount: number | null;
  currency: string | null;
  published_at: string | null;
  deadline: string | null;
  url: string | null;
  cpv: string[];
  trades: string[];
};

// ---------------------------------------------------------------
// Matching: CPV code prefixes and keywords -> our trade slugs
// ---------------------------------------------------------------
const CPV_TRADES: [string, string[]][] = [
  ['451127', ['landscaper']],                       // landscaping work (all sub-codes)
  ['4511272', ['play-sports', 'landscaper']],       // sports grounds and recreational areas
  ['45112723', ['play-sports']],                    // playgrounds
  ['7731', ['grounds-maintenance']],                // planting and maintenance of green areas
  ['7732', ['grounds-maintenance', 'play-sports']], // sports fields maintenance
  ['77330', ['grounds-maintenance']],               // floral display
  ['7734', ['arborist']],                           // tree pruning and hedge trimming
  ['772114', ['arborist']],                         // tree-cutting
  ['772115', ['arborist']],                         // tree-maintenance
  ['71420', ['landscape-architect']],               // landscape architectural services
  ['71421', ['landscape-designer']],                // landscape gardening services
  ['45342', ['fencing']],                           // erection of fencing
  ['349282', ['fencing']],                          // fences
  ['37535200', ['play-sports']],                    // playground equipment
  ['45236', ['play-sports']],                       // flatwork for sports facilities
  ['45232120', ['irrigation']],                     // irrigation works
  ['9062', ['gritting']],                           // snow-clearing
  ['9063', ['gritting']],                           // ice-clearing
  ['349271', ['gritting']],                         // road salt
  ['0345', ['nursery']],                            // tree-nursery products
  ['034520', ['nursery']],                          // trees
  ['14212400', ['supplier']],                       // soil
  ['4550', ['plant-hire']],                         // hire of construction equipment with operator
];

const KEYWORD_TRADES: [RegExp, string[]][] = [
  [/\blandscap(ing|e works?|e maintenance|e improvements?)\b|\bsoft landscap|\bpublic realm\b/i, ['landscaper']],
  [/\bhard landscap|\bblock paving\b|\bpaving works\b/i, ['hard-landscaping']],
  [/\blandscape architect|\blandscape design|\blandscape and visual\b|\bLVIA\b/i, ['landscape-architect']],
  [/\bgarden design/i, ['landscape-designer']],
  [/\bgrounds? maintenance\b|\bgrass cutting\b|\bmowing\b|\bverge\b|\bparks? maintenance\b|\bgreen ?spaces?\b|\bopen spaces? maintenance\b|\bweed (control|spraying)\b/i, ['grounds-maintenance']],
  [/\btree (surgery|works?|survey|maintenance|planting|felling|safety)\b|\barboricultur|\bhedge (cutting|trimming|planting)\b/i, ['arborist']],
  [/\bfencing\b|\bfences?\b|\bgates and railings\b/i, ['fencing']],
  [/\bplay(ground| area| equipment| park)s?\b|\bMUGA\b|\bsports? pitch|\b3G pitch|\bartificial grass pitch|\bsports surfac/i, ['play-sports']],
  [/\birrigation\b/i, ['irrigation']],
  [/\bgritting\b|\bwinter (maintenance|service)\b|\bsnow (clearance|clearing)\b/i, ['gritting']],
  [/\bgroundworks?\b/i, ['groundworks']],
  [/\bplanting\b|\bhorticultur/i, ['landscaper', 'grounds-maintenance']],
  [/\bexternal works\b/i, ['landscaper', 'hard-landscaping', 'groundworks']],
  [/\bSuDS\b|\bsustainable drainage\b|\brain gardens?\b|\bswales?\b/i, ['landscaper', 'groundworks']],
  [/\bbiodiversity net gain\b|\bBNG\b|\bhabitat (creation|enhancement|management)\b|\bwildflower|\bwoodland (creation|management|planting)\b|\bmeadows?\b/i, ['landscaper', 'grounds-maintenance']],
  [/\bartificial (grass|turf)\b|\bturfing\b/i, ['landscaper']],
  [/\bfootpaths?\b|\bpatios?\b|\bresin bound\b/i, ['hard-landscaping']],
  [/\bcemeter(y|ies)\b|\bchurchyards?\b|\ballotments?\b/i, ['grounds-maintenance']],
  [/\btree planting\b|\bstreet trees?\b/i, ['landscaper', 'arborist']],
];

// Contract awards worth passing on: new buildings, housing, schools, health, roads and site works
const BUILD_CPV = ['4521', '45211', '45214', '45215', '45233', '4511', '45222', '45223', '45112'];

/** Which of our trades a notice is for. Empty means not relevant. */
export function matchTrades(cpvs: string[], text: string): string[] {
  const found = new Set<string>();
  for (const code of cpvs) {
    for (const [prefix, trades] of CPV_TRADES) if (code.startsWith(prefix)) trades.forEach((t) => found.add(t));
  }
  for (const [re, trades] of KEYWORD_TRADES) if (re.test(text)) trades.forEach((t) => found.add(t));
  // Plant hire codes are broad; only keep them when the words back it up.
  if (found.has('plant-hire') && !/\b(plant|machinery|excavator|equipment) hire\b/i.test(text)) found.delete('plant-hire');
  return [...found];
}

// ---------------------------------------------------------------
// OCDS parsing
// ---------------------------------------------------------------
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

// NUTS 1 codes (used by Find a Tender for buyer region) -> readable region
const NUTS1: Record<string, string> = {
  UKC: 'North East', UKD: 'North West', UKE: 'Yorkshire and The Humber', UKF: 'East Midlands',
  UKG: 'West Midlands', UKH: 'East of England', UKI: 'London', UKJ: 'South East', UKK: 'South West',
  UKL: 'Wales', UKM: 'Scotland', UKN: 'Northern Ireland',
};

function collectCpvs(tender: Json): string[] {
  const out = new Set<string>();
  const add = (c: Json | undefined) => {
    if (c?.id && (!c.scheme || /cpv/i.test(c.scheme))) out.add(String(c.id).replace(/[^0-9]/g, '').slice(0, 8));
  };
  add(tender?.classification);
  for (const item of tender?.items ?? []) {
    add(item?.classification);
    for (const c of item?.additionalClassifications ?? []) add(c);
  }
  return [...out].filter(Boolean);
}

function noticeUrl(r: Json, source: LeadSource): string | null {
  // The notice's own page is the best link. Both services use the release id as the page id.
  const id = String(r.id ?? '');
  if (source === 'fts' && /^\d{6}-\d{4}$/.test(id)) return `https://www.find-tender.service.gov.uk/Notice/${id}`;
  if (source === 'cf' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return `https://www.contractsfinder.service.gov.uk/Notice/${id}`;
  const docs: Json[] = (r.tender?.documents ?? []).filter((d: Json) => d?.url && !/\/\/api\./i.test(d.url));
  const notice = docs.find((d) => /notice|contractsfinder|find-tender/i.test(`${d.documentType ?? ''} ${d.url}`));
  if (notice?.url) return notice.url;
  const link = (r.links ?? []).find((l: Json) => l?.href);
  if (link?.href) return link.href;
  if (source === 'fts' && r.id) return `https://www.find-tender.service.gov.uk/Notice/${r.id}`;
  return docs.find((d) => d?.url)?.url ?? null;
}

export function toLead(r: Json, source: LeadSource, kind: LeadKind = 'tender'): LeadRow | null {
  const t = r.tender ?? {};
  const title = String(t.title ?? r.title ?? '').trim();
  if (!title) return null;
  // Some feeds send line breaks as the literal characters \r and \n
  const description = t.description ? String(t.description).replace(/\\r\\n|\\n|\\r/g, '\n').replace(/\r/g, '').trim() : null;
  const cpv = collectCpvs(t);
  let trades = matchTrades(cpv, `${title} ${description ?? ''}`);
  let contractor: string | null = null;
  let awardValue: number | null = null;
  if (kind === 'award') {
    // A building or civils job a main contractor has just won. Landscaping, groundworks and
    // fencing are usually let as subcontract packages, so these go to those trades.
    const awards: Json[] = r.awards ?? [];
    const names = new Set<string>();
    for (const a of awards) for (const sup of a?.suppliers ?? []) if (sup?.name) names.add(String(sup.name).trim());
    if (!names.size) for (const p of r.parties ?? []) if ((p.roles ?? []).includes('supplier') && p.name) names.add(String(p.name).trim());
    const amounts = [...awards.map((a) => a?.value?.amount), ...(r.contracts ?? []).map((c: Json) => c?.value?.amount), t.value?.amount]
      .map((v) => (typeof v === 'number' ? v : Number(v))).filter((v) => Number.isFinite(v) && v > 0);
    awardValue = amounts.length ? Math.max(...amounts) : null;
    const isBuild = cpv.some((c) => BUILD_CPV.some((p) => c.startsWith(p)));
    if (!names.size || !isBuild || (awardValue ?? 0) < 1_000_000) return null;
    // Road resurfacing and repair work rarely has a landscaping or fencing package
    if (/resurfac|surface dressing|patching|carriageway (repair|maintenance)|road markings?|risk reduction|pavement framework|\bPDF framework/i.test(`${title} ${description ?? ''}`)) return null;
    contractor = [...names].slice(0, 3).join(', ').slice(0, 200);
    trades = [...new Set([...trades, 'landscaper', 'hard-landscaping', 'groundworks', 'fencing'])];
  }
  if (!trades.length) return null;

  const buyerParty =
    (r.parties ?? []).find((p: Json) => (p.roles ?? []).includes('buyer')) ??
    (r.parties ?? []).find((p: Json) => p.id && p.id === r.buyer?.id);
  const addr = buyerParty?.address ?? {};
  const nuts = typeof addr.region === 'string' ? addr.region.slice(0, 3).toUpperCase() : '';
  const value = awardValue ?? t.value?.amount ?? t.minValue?.amount ?? null;

  return {
    source,
    source_id: String(r.ocid ?? r.id),
    kind,
    contractor,
    status: null,
    meta: {},
    title: title.slice(0, 300),
    description: description ? description.slice(0, 4000) : null,
    buyer: (r.buyer?.name ?? buyerParty?.name ?? null)?.slice(0, 200) ?? null,
    postcode: addr.postalCode ? String(addr.postalCode).toUpperCase().trim() : null,
    region: NUTS1[nuts] ?? (source === 'pcs' ? 'Scotland' : source === 's2w' ? 'Wales' : null),
    lat: null,
    lng: null,
    value_amount: typeof value === 'number' ? value : value ? Number(value) || null : null,
    currency: t.value?.currency ?? null,
    published_at: kind === 'award' ? (r.awards?.[0]?.date ?? r.date ?? null) : (t.datePublished ?? r.date ?? null),
    deadline: kind === 'award' ? null : (t.tenderPeriod?.endDate ?? null),
    url: noticeUrl(r, source),
    cpv,
    trades,
  };
}

/** Pulls releases out of whatever shape the feed returns (package, list of packages, or bare list). */
export function releasesOf(body: unknown): Json[] {
  if (Array.isArray(body)) return body.flatMap((x) => (x && typeof x === 'object' && 'releases' in x ? (x as Json).releases : [x]));
  if (body && typeof body === 'object') {
    const b = body as Json;
    if (Array.isArray(b.releases)) return b.releases;
    if (Array.isArray(b.records)) return b.records.map((rec: Json) => rec.compiledRelease ?? rec.releases?.[0]).filter(Boolean);
  }
  return [];
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'TheLittleGreenBook/1.0 (+https://www.tlgb.co.uk)' },
    signal: AbortSignal.timeout(25_000),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`${res.status} from ${new URL(url).host}`);
  return res.json();
}

/** Find a Tender and Contracts Finder: page through with links.next. */
// What each feed returned on the last run, so a thin result can be told apart from a broken one
const scanned: Record<string, string> = {};

async function fetchPaged(firstUrl: string, source: LeadSource, maxPages: number, kind: LeadKind = 'tender'): Promise<LeadRow[]> {
  const out: LeadRow[] = [];
  let url: string | null = firstUrl;
  let seen = 0;
  let page = 0;
  for (; url && page < maxPages; page++) {
    const body = (await getJson(url)) as Json;
    const rels = releasesOf(body);
    seen += rels.length;
    for (const r of rels) {
      const lead = toLead(r, source, kind);
      if (lead) out.push(lead);
    }
    url = body?.links?.next ?? null;
  }
  scanned[`${source}-${kind}`] = `${seen} notices in ${page} pages${url ? ' (stopped at page limit)' : ''}`;
  return out;
}

/** Scotland and Wales: one call per month of contract notices. */
async function fetchMonthly(base: string, source: LeadSource, months: string[]): Promise<LeadRow[]> {
  const out: LeadRow[] = [];
  for (const m of months) {
    const body = await getJson(`${base}/Notices?dateFrom=${m}&noticeType=2&outputType=0&locale=2057`);
    for (const r of releasesOf(body)) {
      const lead = toLead(r, source);
      if (lead) out.push(lead);
    }
  }
  return out;
}

// ---------------------------------------------------------------
// Planning applications via UK PlanIt (scrapes every council register)
// ---------------------------------------------------------------
const PLANIT = 'https://www.planit.org.uk/api/applics/json';
const LANDSCAPE_CONDITION = /landscap|planting|trees?\b|hedg|boundary treatment|ecolog|biodiversity|habitat|open space|play (area|space)|SuDS|drainage/i;
const RESIDENTIAL = /\bdwellings?\b|\bhomes\b|\bhouses\b|\bresidential\b|\bflats\b|\bapartments\b/i;
const seen = (v: unknown) => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s && !/^(see source|no data|n\/a|none)$/i.test(s) ? s : '';
};
const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}...` : s);

type Applic = Json & { other_fields?: Json };

function planitLead(a: Applic, kind: 'planning' | 'trees'): LeadRow | null {
  const desc = String(a.description ?? '').trim();
  const address = String(a.address ?? '').replace(/\s+/g, ' ').trim();
  if (!desc || !a.name) return null;
  const type = String(a.app_type ?? '');
  const size = String(a.app_size ?? '');
  const state = String(a.app_state ?? '');
  if (/rejected|withdrawn/i.test(state)) return null;
  const of = a.other_fields ?? {};

  let title: string;
  let trades: string[];
  if (kind === 'trees') {
    title = `Tree works: ${short(address || desc, 110)}`;
    trades = ['arborist'];
  } else if (type === 'Conditions') {
    if (!LANDSCAPE_CONDITION.test(desc)) return null;
    title = `Landscaping details submitted: ${short(address || desc, 90)}`;
    trades = matchTrades([], desc);
    trades.push('landscaper');
    if (/\btrees?\b|arboricult/i.test(desc)) trades.push('arborist');
    if (/maintenance|management/i.test(desc)) trades.push('grounds-maintenance');
    if (/boundary treatment|fenc/i.test(desc)) trades.push('fencing');
  } else {
    if (!['Full', 'Outline', 'Amendment'].includes(type) || !/^(medium|large)$/i.test(size)) return null;
    // Screening and scoping requests are paperwork about a scheme, not the scheme itself
    if (/screening opinion|scoping opinion|\bEIA screening|prior notification|pre-?app/i.test(`${desc} ${a.uid ?? ''}`)) return null;
    title = `${size} development${type === 'Outline' ? ' (outline)' : ''}: ${short(address || desc, 100)}`;
    trades = [...matchTrades([], desc), 'landscaper', 'hard-landscaping', 'groundworks'];
    if (RESIDENTIAL.test(desc)) trades.push('fencing');
    if (type === 'Outline') trades.push('landscape-architect');
  }

  const applicant = seen(of.applicant_company) || seen(of.applicant_name);
  const agent = seen(of.agent_company) || seen(of.agent_name);
  const lat = Number(a.location_y ?? of.lat);
  const lng = Number(a.location_x ?? of.lng);
  const meta: Record<string, string> = {};
  if (a.uid) meta.ref = String(a.uid);
  if (type) meta.app_type = type;
  if (size) meta.app_size = size;
  if (agent) meta.agent = agent.slice(0, 120);
  if (!applicant && seen(of.applicant_address)) meta.applicant_address = seen(of.applicant_address).slice(0, 160);
  if (seen(of.docs_url)) meta.docs_url = seen(of.docs_url);
  if (a.associated_id) meta.parent_ref = String(a.associated_id);

  return {
    source: 'planit',
    source_id: String(a.name),
    kind,
    contractor: applicant ? applicant.slice(0, 200) : null,
    status: seen(of.status) || state || null,
    meta,
    title: title.slice(0, 300),
    description: desc.slice(0, 4000),
    buyer: a.area_name ? `${a.area_name} planning` : null,
    postcode: a.postcode ? String(a.postcode).toUpperCase().trim() : null,
    region: null,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    value_amount: null,
    currency: null,
    published_at: a.start_date ?? null,
    deadline: null,
    url: a.url ?? a.link ?? null,
    cpv: [],
    trades: [...new Set(trades)],
  };
}

/** One PlanIt search, paged. PlanIt asks for modest use, so pages are big and calls are few. */
async function fetchPlanit(query: string, kind: 'planning' | 'trees', maxPages: number): Promise<LeadRow[]> {
  const out: LeadRow[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const body = (await getJson(`${PLANIT}?${query}&pg_sz=400&page=${page}`)) as Json;
    for (const a of body?.records ?? []) {
      const lead = planitLead(a, kind);
      if (lead) out.push(lead);
    }
    if (typeof body?.to !== 'number' || typeof body?.total !== 'number' || body.to + 1 >= body.total) break;
  }
  return out;
}

const iso = (d: Date) => d.toISOString().slice(0, 19);
const mmyyyy = (d: Date) => `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`;

/** Adds region and map position from the buyer's postcode (postcodes.io, free, no key). */
async function geocode(leads: LeadRow[]) {
  const pcs = [...new Set(leads.map((l) => l.postcode).filter((p): p is string => !!p))];
  const found = new Map<string, { lat: number; lng: number; region: string | null }>();
  for (let i = 0; i < pcs.length; i += 100) {
    try {
      const res = await fetch('https://api.postcodes.io/postcodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postcodes: pcs.slice(i, i + 100) }),
        signal: AbortSignal.timeout(15_000),
      });
      const json = await res.json();
      for (const r of json?.result ?? []) {
        const p = r?.result;
        if (p) found.set(String(r.query).toUpperCase(), { lat: p.latitude, lng: p.longitude, region: p.region ?? p.country ?? null });
      }
    } catch (err) {
      console.warn('leads: geocode batch failed', err);
    }
  }
  for (const l of leads) {
    const g = l.postcode ? found.get(l.postcode) : undefined;
    if (g) {
      l.lat = l.lat ?? g.lat;
      l.lng = l.lng ?? g.lng;
      l.region = g.region ?? l.region;
    }
  }

  // No postcode but a map position (planning applications): look the region up from that
  const todo = leads.filter((l) => !l.region && l.lat != null && l.lng != null);
  for (let i = 0; i < todo.length; i += 100) {
    const batch = todo.slice(i, i + 100);
    try {
      const res = await fetch('https://api.postcodes.io/postcodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geolocations: batch.map((l) => ({ latitude: l.lat, longitude: l.lng, limit: 1, radius: 2000 })) }),
        signal: AbortSignal.timeout(15_000),
      });
      const json = await res.json();
      (json?.result ?? []).forEach((r: Json, j: number) => {
        const p = r?.result?.[0];
        if (p && batch[j]) {
          batch[j].region = p.region ?? p.country ?? null;
          batch[j].postcode = batch[j].postcode ?? p.postcode ?? null;
        }
      });
    } catch (err) {
      console.warn('leads: reverse geocode batch failed', err);
    }
  }
}

/**
 * Fetches the last `days` days from every source and saves anything relevant.
 * A source that fails is logged and skipped, so one outage never stops the rest.
 */
export async function importLeads({ days = 3 }: { days?: number } = {}) {
  const now = new Date();
  const from = new Date(now.getTime() - days * 86_400_000);
  const months = [...new Set([mmyyyy(from), mmyyyy(now)])];
  const pages = Math.min(40, 5 + days * 3);
  const fts = (stage: string) => `https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages?updatedFrom=${iso(from)}&stages=${stage}&limit=100`;
  const cf = (stage: string) => `https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search?publishedFrom=${iso(from)}&stages=${stage}&limit=100`;
  // PlanIt fills in an application's type and size a few days after it first appears, so
  // always look back at least two weeks. Repeats just update the same rows.
  const recent = Math.max(14, days);
  const pp = Math.ceil(recent / 7);

  const jobs: [string, () => Promise<LeadRow[]>][] = [
    ['fts', () => fetchPaged(fts('tender'), 'fts', pages)],
    ['cf', () => fetchPaged(cf('tender'), 'cf', pages)],
    ['fts-upcoming', () => fetchPaged(fts('planning'), 'fts', pages, 'pipeline')],
    ['cf-upcoming', () => fetchPaged(cf('planning'), 'cf', pages, 'pipeline')],
    ['fts-awards', () => fetchPaged(fts('award'), 'fts', pages, 'award')],
    ['cf-awards', () => fetchPaged(cf('award'), 'cf', pages, 'award')],
    ['pcs', () => fetchMonthly('https://api.publiccontractsscotland.gov.uk/v1', 'pcs', months)],
    ['s2w', () => fetchMonthly('https://api.sell2wales.gov.wales/v1', 's2w', months)],
    ['planning', () => fetchPlanit(`recent=${recent}&app_size=Medium,Large&app_type=Full,Outline,Amendment`, 'planning', pp)],
    ['planning-conditions', () => fetchPlanit(`recent=${recent}&app_type=Conditions&search=${encodeURIComponent('landscape or landscaping or planting or trees or "boundary treatment" or biodiversity')}`, 'planning', pp)],
    ['tree-works', () => fetchPlanit(`recent=${recent}&app_type=Trees`, 'trees', pp * 3)],
  ];

  const summary: Record<string, number | string> = {};
  const all: LeadRow[] = [];
  const results = await Promise.allSettled(jobs.map(([, run]) => run()));
  results.forEach((r, i) => {
    const src = jobs[i][0];
    if (r.status === 'fulfilled') {
      all.push(...r.value);
      summary[src] = r.value.length;
    } else {
      console.error(`leads: ${src} failed`, r.reason);
      summary[src] = `failed: ${String(r.reason?.message ?? r.reason).slice(0, 80)}`;
    }
  });

  // Same notice can turn up as an upcoming tender, an open tender and an award (they share
  // an id). Keep the most advanced stage.
  const rank: Record<LeadKind, number> = { pipeline: 0, tender: 1, award: 2, planning: 0, trees: 0 };
  const byKey = new Map<string, LeadRow>();
  for (const l of all) {
    const k = `${l.source}:${l.source_id}`;
    const prev = byKey.get(k);
    if (!prev || rank[l.kind] >= rank[prev.kind]) byKey.set(k, l);
  }
  const unique = [...byKey.values()];
  await geocode(unique);

  for (let i = 0; i < unique.length; i += 200) {
    const { error } = await db().from('leads').upsert(unique.slice(i, i + 200), { onConflict: 'source,source_id' });
    if (error) console.error('leads: save failed', error);
  }

  // Tidy up: drop leads whose deadline passed more than 30 days ago, and leads with no
  // deadline once they are old news
  const ago = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();
  await db().from('leads').delete().lt('deadline', ago(30));
  const keepDays: [LeadKind, number][] = [['trees', 45], ['planning', 120], ['award', 120], ['pipeline', 180], ['tender', 90]];
  for (const [kind, d] of keepDays) await db().from('leads').delete().eq('kind', kind).is('deadline', null).lt('published_at', ago(d));

  return { saved: unique.length, bySource: summary, scanned: { ...scanned } };
}
