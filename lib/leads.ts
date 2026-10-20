import 'server-only';
import { db } from './supabase';

/**
 * Leads: public sector tenders pulled from the free government open-data feeds.
 *
 *  - Find a Tender (UK-wide, larger contracts)        www.find-tender.service.gov.uk
 *  - Contracts Finder (England, contracts over ~£12k)  www.contractsfinder.service.gov.uk
 *  - Public Contracts Scotland                         api.publiccontractsscotland.gov.uk
 *  - Sell2Wales                                        api.sell2wales.gov.wales
 *
 * All four publish in the Open Contracting Data Standard (OCDS), so one parser handles them.
 * Only notices that look like our trades are kept, matched on CPV code first and then
 * on keywords in the title and description.
 */

export type LeadSource = 'fts' | 'cf' | 'pcs' | 's2w';
export const SOURCE_LABEL: Record<LeadSource, string> = {
  fts: 'Find a Tender',
  cf: 'Contracts Finder',
  pcs: 'Public Contracts Scotland',
  s2w: 'Sell2Wales',
};

export type LeadRow = {
  source: LeadSource;
  source_id: string;
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
];

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
  const docs: Json[] = r.tender?.documents ?? [];
  const notice = docs.find((d) => d?.url && /notice|contractsfinder|find-tender/i.test(`${d.documentType ?? ''} ${d.url}`));
  if (notice?.url) return notice.url;
  const link = (r.links ?? []).find((l: Json) => l?.href);
  if (link?.href) return link.href;
  if (source === 'fts' && r.id) return `https://www.find-tender.service.gov.uk/Notice/${r.id}`;
  return docs.find((d) => d?.url)?.url ?? null;
}

export function toLead(r: Json, source: LeadSource): LeadRow | null {
  const t = r.tender ?? {};
  const title = String(t.title ?? r.title ?? '').trim();
  if (!title) return null;
  const description = t.description ? String(t.description).trim() : null;
  const cpv = collectCpvs(t);
  const trades = matchTrades(cpv, `${title} ${description ?? ''}`);
  if (!trades.length) return null;

  const buyerParty =
    (r.parties ?? []).find((p: Json) => (p.roles ?? []).includes('buyer')) ??
    (r.parties ?? []).find((p: Json) => p.id && p.id === r.buyer?.id);
  const addr = buyerParty?.address ?? {};
  const nuts = typeof addr.region === 'string' ? addr.region.slice(0, 3).toUpperCase() : '';
  const value = t.value?.amount ?? t.minValue?.amount ?? null;

  return {
    source,
    source_id: String(r.ocid ?? r.id),
    title: title.slice(0, 300),
    description: description ? description.slice(0, 4000) : null,
    buyer: (r.buyer?.name ?? buyerParty?.name ?? null)?.slice(0, 200) ?? null,
    postcode: addr.postalCode ? String(addr.postalCode).toUpperCase().trim() : null,
    region: NUTS1[nuts] ?? (source === 'pcs' ? 'Scotland' : source === 's2w' ? 'Wales' : null),
    lat: null,
    lng: null,
    value_amount: typeof value === 'number' ? value : value ? Number(value) || null : null,
    currency: t.value?.currency ?? null,
    published_at: t.datePublished ?? r.date ?? null,
    deadline: t.tenderPeriod?.endDate ?? null,
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
async function fetchPaged(firstUrl: string, source: LeadSource, maxPages: number): Promise<LeadRow[]> {
  const out: LeadRow[] = [];
  let url: string | null = firstUrl;
  for (let page = 0; url && page < maxPages; page++) {
    const body = (await getJson(url)) as Json;
    for (const r of releasesOf(body)) {
      const lead = toLead(r, source);
      if (lead) out.push(lead);
    }
    url = body?.links?.next ?? null;
  }
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
      l.lat = g.lat;
      l.lng = g.lng;
      l.region = g.region ?? l.region;
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

  const jobs: [LeadSource, () => Promise<LeadRow[]>][] = [
    ['fts', () => fetchPaged(`https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages?updatedFrom=${iso(from)}&stages=tender&limit=100`, 'fts', pages)],
    ['cf', () => fetchPaged(`https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search?publishedFrom=${iso(from)}&stages=tender&limit=100`, 'cf', pages)],
    ['pcs', () => fetchMonthly('https://api.publiccontractsscotland.gov.uk/v1', 'pcs', months)],
    ['s2w', () => fetchMonthly('https://api.sell2wales.gov.wales/v1', 's2w', months)],
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

  // Same notice can appear more than once in a run (updates); keep the last one
  const unique = [...new Map(all.map((l) => [`${l.source}:${l.source_id}`, l])).values()];
  await geocode(unique);

  for (let i = 0; i < unique.length; i += 200) {
    const { error } = await db().from('leads').upsert(unique.slice(i, i + 200), { onConflict: 'source,source_id' });
    if (error) console.error('leads: save failed', error);
  }

  // Tidy up: drop leads whose deadline passed more than 30 days ago
  await db().from('leads').delete().lt('deadline', new Date(now.getTime() - 30 * 86_400_000).toISOString());

  return { saved: unique.length, bySource: summary };
}
