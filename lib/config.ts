// ---------------------------------------------------------------
// Accreditations and qualifications.
// `key` is what gets stored on a listing, so never rename a key once used.
// `trades` empty = general (shown to every trade); otherwise shown when one of
// those trades is selected. `expires` = the certificate or membership has a date
// we should track; personal training certificates usually don't.
// ---------------------------------------------------------------
export type Accreditation = { key: string; label: string; trades: string[]; expires: boolean; hint?: string };

export const ACCREDITATION_LIST: Accreditation[] = [
  // General: health and safety (SSIP), prequalification and management systems
  { key: 'CHAS', label: 'CHAS', trades: [], expires: true },
  { key: 'Constructionline Silver', label: 'Constructionline Silver', trades: [], expires: true },
  { key: 'Constructionline Gold', label: 'Constructionline Gold', trades: [], expires: true },
  { key: 'SMAS Worksafe', label: 'SMAS Worksafe', trades: [], expires: true },
  { key: 'SafeContractor', label: 'SafeContractor', trades: [], expires: true },
  { key: 'Acclaim', label: 'Acclaim', trades: [], expires: true },
  { key: 'Avetta', label: 'Avetta', trades: [], expires: true },
  { key: 'ISO 9001', label: 'ISO 9001 (quality)', trades: [], expires: true },
  { key: 'ISO 14001', label: 'ISO 14001 (environmental)', trades: [], expires: true },
  { key: 'ISO 45001', label: 'ISO 45001 (health and safety)', trades: [], expires: true },
  { key: 'CSCS/LISS cards', label: 'CSCS or LISS cards for all operatives', trades: [], expires: false },
  { key: 'TrustMark', label: 'TrustMark', trades: [], expires: true },

  // Landscaping and grounds care
  { key: 'BALI', label: 'BALI accredited member', trades: ['landscaper', 'landscape-designer', 'grounds-maintenance', 'hard-landscaping', 'irrigation', 'supplier', 'nursery'], expires: true },
  { key: 'APL', label: 'Association of Professional Landscapers (APL)', trades: ['landscaper', 'landscape-designer'], expires: true },
  { key: 'NHSS 18', label: 'NHSS 18 (highways landscape and maintenance)', trades: ['landscaper', 'grounds-maintenance', 'arborist'], expires: true },
  { key: 'NPTC PA1/PA6', label: 'NPTC PA1 / PA6 pesticide application', trades: ['landscaper', 'grounds-maintenance'], expires: false },
  { key: 'Amenity Assured', label: 'Amenity Assured', trades: ['grounds-maintenance'], expires: true },
  { key: 'BASIS', label: 'BASIS registered', trades: ['grounds-maintenance'], expires: true },
  { key: 'Lantra', label: 'Lantra certificates (other)', trades: ['landscaper', 'grounds-maintenance', 'arborist', 'gritting'], expires: false },
  { key: 'NPTC', label: 'NPTC certificates (other)', trades: ['landscaper', 'grounds-maintenance', 'arborist'], expires: false },

  // Design
  { key: 'CMLI', label: 'Chartered Landscape Architect (CMLI)', trades: ['landscape-architect'], expires: true },
  { key: 'LI Registered Practice', label: 'Landscape Institute Registered Practice', trades: ['landscape-architect'], expires: true },
  { key: 'CIEEM', label: 'CIEEM member (ecology and biodiversity net gain)', trades: ['landscape-architect'], expires: true },
  { key: 'SGD', label: 'Society of Garden Designers member (MSGD)', trades: ['landscape-designer'], expires: true },

  // Trees
  { key: 'Arboricultural Association ARB Approved', label: 'Arboricultural Association ARB Approved Contractor', trades: ['arborist'], expires: true },
  { key: 'NPTC CS30/31', label: 'NPTC chainsaw maintenance and felling (CS30 / CS31)', trades: ['arborist'], expires: false },
  { key: 'NPTC CS38/39', label: 'NPTC tree climbing, aerial rescue and aerial cutting (CS38 / CS39)', trades: ['arborist'], expires: false },
  { key: 'Lantra Tree Inspection', label: 'Lantra Professional Tree Inspection', trades: ['arborist'], expires: true },
  { key: 'ISA Certified Arborist', label: 'ISA Certified Arborist', trades: ['arborist'], expires: true },

  // Groundworks, paving and plant
  { key: 'CPCS', label: 'CPCS plant operator cards', trades: ['groundworks', 'plant-hire'], expires: false },
  { key: 'NPORS', label: 'NPORS plant operator cards', trades: ['groundworks', 'plant-hire'], expires: false },
  { key: 'NRSWA', label: 'NRSWA street works', trades: ['groundworks', 'hard-landscaping'], expires: true },
  { key: 'SMSTS/SSSTS', label: 'SMSTS / SSSTS site management', trades: ['groundworks', 'landscaper', 'hard-landscaping'], expires: true },
  { key: 'NHSS 30', label: 'NHSS 30 (highways modular paving)', trades: ['hard-landscaping'], expires: true },
  { key: 'Marshalls Register', label: 'Marshalls Register of accredited installers', trades: ['hard-landscaping'], expires: true },
  { key: 'Manufacturer approved installer', label: 'Other manufacturer approved installer (Brett, Tobermore etc.)', trades: ['hard-landscaping'], expires: true },
  { key: 'Interlay', label: 'Interlay member', trades: ['hard-landscaping'], expires: true },
  { key: 'CPA', label: 'Construction Plant-hire Association (CPA) member', trades: ['plant-hire'], expires: true },
  { key: 'IPAF', label: 'IPAF powered access', trades: ['plant-hire', 'arborist'], expires: true },

  // Fencing
  { key: 'FIA', label: 'Fencing Industry Association (FIA) member', trades: ['fencing'], expires: true },
  { key: 'FISS', label: 'FISS / CSCS fencing cards', trades: ['fencing'], expires: true },
  { key: 'NHSS 2A', label: 'NHSS 2A (highways fencing)', trades: ['fencing'], expires: true },

  // Specialists
  { key: 'UKIA', label: 'UK Irrigation Association member', trades: ['irrigation'], expires: true },
  { key: 'WaterSafe', label: 'WaterSafe approved contractor', trades: ['irrigation'], expires: true },
  { key: 'API', label: 'Association of Play Industries (API) member', trades: ['play-sports'], expires: true },
  { key: 'SAPCA', label: 'SAPCA member (sports pitches)', trades: ['play-sports'], expires: true },
  { key: 'RPII', label: 'RPII registered play inspector', trades: ['play-sports'], expires: true },
  { key: 'Winter service (C&G 6159)', label: 'Winter service operatives (City & Guilds 6159)', trades: ['gritting'], expires: true },
  { key: 'HTA', label: 'Horticultural Trades Association (HTA) member', trades: ['nursery'], expires: true },
  { key: 'Plant Healthy', label: 'Plant Healthy certified', trades: ['nursery'], expires: true },
  { key: 'APHA plant passport', label: 'APHA registered to issue plant passports', trades: ['nursery'], expires: false },
  { key: 'BS 3882 topsoil', label: 'BS 3882 tested topsoil', trades: ['supplier'], expires: true },
  { key: 'PAS 100', label: 'PAS 100 certified compost', trades: ['supplier'], expires: true },
  { key: 'FSC/PEFC', label: 'FSC or PEFC chain of custody (timber)', trades: ['supplier', 'fencing'], expires: true },
  { key: 'Lantra Approved Centre', label: 'Lantra approved training provider', trades: ['training'], expires: true },
  { key: 'City & Guilds Approved Centre', label: 'City & Guilds / NPTC approved centre', trades: ['training'], expires: true },
  { key: 'CITB ATO', label: 'CITB Approved Training Organisation', trades: ['training'], expires: true },
];

export const ACCREDITATIONS = ACCREDITATION_LIST.map((a) => a.key) as [string, ...string[]];
export const ACCREDITATIONS_WITHOUT_EXPIRY = ACCREDITATION_LIST.filter((a) => !a.expires).map((a) => a.key);
export const GENERAL_ACCREDITATIONS = ACCREDITATION_LIST.filter((a) => a.trades.length === 0);
// A trade's own qualifications first, shared ones after, catch-all "(other)" entries last.
const specificity = (a: Accreditation) => (a.label.includes('(other)') ? 99 : a.trades.length);
export const accreditationsForTrade = (slug: string) =>
  ACCREDITATION_LIST.filter((a) => a.trades.includes(slug)).sort((x, y) => specificity(x) - specificity(y));
export const accreditationLabel = (key: string) => ACCREDITATION_LIST.find((a) => a.key === key)?.label ?? key;

// Keep in step with the trade_categories seed in supabase/schema.sql
export const TRADES: { slug: string; label: string }[] = [
  { slug: 'landscaper', label: 'Landscaper' },
  { slug: 'landscape-architect', label: 'Landscape Architect' },
  { slug: 'landscape-designer', label: 'Garden / Landscape Designer' },
  { slug: 'arborist', label: 'Arborist / Tree Surgeon' },
  { slug: 'groundworks', label: 'Groundworker' },
  { slug: 'grounds-maintenance', label: 'Grounds Maintenance' },
  { slug: 'hard-landscaping', label: 'Hard Landscaping / Paving' },
  { slug: 'fencing', label: 'Fencing Contractor' },
  { slug: 'irrigation', label: 'Irrigation' },
  { slug: 'play-sports', label: 'Play & Sports Surfacing' },
  { slug: 'gritting', label: 'Gritting / Winter Maintenance' },
  { slug: 'nursery', label: 'Nursery / Plant Supplier' },
  { slug: 'supplier', label: 'Materials Supplier' },
  { slug: 'plant-hire', label: 'Machine / Plant Hire' },
  { slug: 'training', label: 'Training Provider' },
];

export const tradeLabel = (slug: string) =>
  TRADES.find((t) => t.slug === slug)?.label ?? slug;

// Annual turnover bands. Prices are PLACEHOLDERS for Ed and Trudy to set;
// change them here and the sign-up form updates.
export const TURNOVER_BANDS: { key: string; label: string; price: number }[] = [
  { key: 'under-100k', label: 'Under £100k', price: 150 },
  { key: '100k-500k', label: '£100k to £500k', price: 250 },
  { key: '500k-2m', label: '£500k to £2m', price: 350 },
  { key: '2m-10m', label: '£2m to £10m', price: 500 },
  { key: 'over-10m', label: 'Over £10m', price: 750 },
];

export const turnoverBand = (key: string | null | undefined) =>
  TURNOVER_BANDS.find((b) => b.key === key);

export const PL_COVER_OPTIONS = [1_000_000, 2_000_000, 5_000_000, 10_000_000];

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const DOC_MIME = ['application/pdf', 'image/jpeg', 'image/png'];
export const PHOTO_MIME = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_PHOTOS = 6;

export function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

/** The one public address for TLGB: sender, reply-to and contact on every page and email. */
export const TLGB_EMAIL = 'admin@tlgb.co.uk';

export const siteUrl = () => process.env.SITE_URL ?? 'http://localhost:3000';

export const gbp = (n: number | null | undefined) =>
  n == null ? 'Not given' : `£${(n / 1_000_000).toLocaleString('en-GB')}m`;
