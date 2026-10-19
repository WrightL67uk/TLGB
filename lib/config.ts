export const ACCREDITATIONS = [
  'CHAS',
  'Constructionline Silver',
  'Constructionline Gold',
  'SMAS Worksafe',
  'SafeContractor',
  'Acclaim',
  'Avetta',
  'BALI',
  'Arboricultural Association ARB Approved',
  'Lantra',
  'NPTC',
  'ISO 9001',
  'ISO 14001',
  'ISO 45001',
] as const;

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

export const siteUrl = () => process.env.SITE_URL ?? 'http://localhost:3000';

export const gbp = (n: number | null | undefined) =>
  n == null ? 'Not given' : `£${(n / 1_000_000).toLocaleString('en-GB')}m`;
