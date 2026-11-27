import 'server-only';
import { db } from './supabase';
import { TRADES, tradeLabel } from './config';
import { unverifiedReason } from './membership';

/** UK postcode areas (the letters at the start of a postcode) with the place people know them by. */
export const POSTCODE_AREAS: Record<string, string> = {
  AB: 'Aberdeen', AL: 'St Albans', B: 'Birmingham', BA: 'Bath', BB: 'Blackburn', BD: 'Bradford', BH: 'Bournemouth', BL: 'Bolton', BN: 'Brighton', BR: 'Bromley',
  BS: 'Bristol', BT: 'Belfast', CA: 'Carlisle', CB: 'Cambridge', CF: 'Cardiff', CH: 'Chester', CM: 'Chelmsford', CO: 'Colchester', CR: 'Croydon', CT: 'Canterbury',
  CV: 'Coventry', CW: 'Crewe', DA: 'Dartford', DD: 'Dundee', DE: 'Derby', DG: 'Dumfries', DH: 'Durham', DL: 'Darlington', DN: 'Doncaster', DT: 'Dorchester',
  DY: 'Dudley', E: 'East London', EC: 'Central London (EC)', EH: 'Edinburgh', EN: 'Enfield', EX: 'Exeter', FK: 'Falkirk', FY: 'Blackpool', G: 'Glasgow', GL: 'Gloucester',
  GU: 'Guildford', HA: 'Harrow', HD: 'Huddersfield', HG: 'Harrogate', HP: 'Hemel Hempstead', HR: 'Hereford', HS: 'Outer Hebrides', HU: 'Hull', HX: 'Halifax', IG: 'Ilford',
  IP: 'Ipswich', IV: 'Inverness', KA: 'Kilmarnock', KT: 'Kingston upon Thames', KW: 'Kirkwall', KY: 'Kirkcaldy', L: 'Liverpool', LA: 'Lancaster', LD: 'Llandrindod Wells',
  LE: 'Leicester', LL: 'Llandudno', LN: 'Lincoln', LS: 'Leeds', LU: 'Luton', M: 'Manchester', ME: 'Medway', MK: 'Milton Keynes', ML: 'Motherwell', N: 'North London',
  NE: 'Newcastle upon Tyne', NG: 'Nottingham', NN: 'Northampton', NP: 'Newport', NR: 'Norwich', NW: 'North West London', OL: 'Oldham', OX: 'Oxford', PA: 'Paisley',
  PE: 'Peterborough', PH: 'Perth', PL: 'Plymouth', PO: 'Portsmouth', PR: 'Preston', RG: 'Reading', RH: 'Redhill', RM: 'Romford', S: 'Sheffield', SA: 'Swansea',
  SE: 'South East London', SG: 'Stevenage', SK: 'Stockport', SL: 'Slough', SM: 'Sutton', SN: 'Swindon', SO: 'Southampton', SP: 'Salisbury', SR: 'Sunderland',
  SS: 'Southend-on-Sea', ST: 'Stoke-on-Trent', SW: 'South West London', SY: 'Shrewsbury', TA: 'Taunton', TD: 'Galashiels', TF: 'Telford', TN: 'Tunbridge Wells',
  TQ: 'Torquay', TR: 'Truro', TS: 'Teesside', TW: 'Twickenham', UB: 'Southall', W: 'West London', WA: 'Warrington', WC: 'Central London (WC)', WD: 'Watford',
  WF: 'Wakefield', WN: 'Wigan', WR: 'Worcester', WS: 'Walsall', WV: 'Wolverhampton', YO: 'York', ZE: 'Shetland',
};

/** "SG1 2AB" gives "SG". Null if it does not look like a UK postcode. */
export const areaOf = (postcode: string | null | undefined) => {
  const m = String(postcode ?? '').trim().toUpperCase().match(/^([A-Z]{1,2})\d/);
  return m && POSTCODE_AREAS[m[1]] ? m[1] : null;
};
export const areaName = (code: string) => POSTCODE_AREAS[code.toUpperCase()] ?? null;
/** Short form for headings: "the Stevenage area" reads better than "Stevenage" alone. */
export const areaPhrase = (code: string) => `the ${areaName(code)} area`;

/** How each trade reads in a page title: "landscapers", "tree surgeons and arborists". */
const PLURALS: Record<string, string> = {
  landscaper: 'landscapers', 'landscape-architect': 'landscape architects', 'landscape-designer': 'garden and landscape designers',
  arborist: 'tree surgeons and arborists', groundworks: 'groundworkers', 'grounds-maintenance': 'grounds maintenance companies',
  'hard-landscaping': 'paving and hard landscaping contractors', fencing: 'fencing contractors', 'garden-buildings': 'garden building specialists',
  irrigation: 'irrigation specialists', 'play-sports': 'play and sports surfacing contractors', gritting: 'gritting and winter maintenance contractors',
  nursery: 'nurseries and plant suppliers', supplier: 'materials suppliers', 'plant-hire': 'plant and machinery hire companies', training: 'training providers',
 'gardener': 'gardeners and garden maintenance services',
 'turfing': 'turfing and seeding contractors',
 'artificial-grass': 'artificial grass installers',
 'surfacing': 'tarmac, resin and driveway surfacing contractors',
 'walling': 'walling, brickwork and stonemasonry contractors',
 'decking-timber': 'decking, pergola and timber structure specialists',
 'drainage': 'drainage and SuDS contractors',
 'green-roofs': 'green roof and living wall specialists',
 'water-features': 'water feature and pond specialists',
 'lighting': 'external and garden lighting specialists',
 'ecology': 'ecology and biodiversity consultants',
 'arb-consultant': 'arboricultural consultants and tree surveyors',
 'surveying': 'land and topographical surveyors',
 'invasive-species': 'invasive weed control specialists',
 'rail-highways': 'rail and highways vegetation management contractors',
 'waste-muckaway': 'waste, skip and muckaway services',
 'pest-control': 'pest controllers',
 'consultancy': 'landscape and grounds consultants',
 'inspections': 'inspection and audit services',
};
export const tradePlural = (slug: string) => PLURALS[slug] ?? tradeLabel(slug).toLowerCase();

/** Capitalised plural for headings: "Landscapers". */
export const tradePluralCap = (slug: string) => { const t = tradePlural(slug); return t.charAt(0).toUpperCase() + t.slice(1); };

export type Listing = {
  id: string; trading_name: string; trades: string[]; accreditations: string[]; accreditation_expiries: Record<string, string> | null;
  description: string | null; base_postcode: string; business_type: string; company_number: string | null;
  pl_cover_amount: number | null; pl_expiry: string | null; el_cover_amount: number | null; el_expiry: string | null;
  founding_member: boolean; subscription_status: string | null; free_listing: boolean; area: string; verified: boolean;
};

/** Every business that has a public profile, with the postcode area it is based in. Cached for an hour by the pages that use it. */
export async function publicListings(): Promise<Listing[]> {
  const { data } = await db().from('businesses')
    .select('id, trading_name, trades, accreditations, accreditation_expiries, description, base_postcode, business_type, company_number, pl_cover_amount, pl_expiry, el_cover_amount, el_expiry, founding_member, subscription_status, free_listing')
    .eq('status', 'approved').limit(5000);
  const out: Listing[] = [];
  for (const b of (data ?? []) as Omit<Listing, 'area' | 'verified'>[]) {
    if (!(b.founding_member || b.free_listing || ['active', 'trialing', 'past_due', 'cancelled'].includes(b.subscription_status ?? ''))) continue;
    const area = areaOf(b.base_postcode);
    if (!area) continue;
    out.push({ ...b, area, verified: !unverifiedReason(b as never) });
  }
  return out;
}

export const knownTrade = (slug: string) => TRADES.some((t) => t.slug === slug);
