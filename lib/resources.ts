// Shared lists for the supplier directory and Help Hub.

export const SUPPLIER_CATEGORIES: { key: string; label: string }[] = [
  { key: 'soil-aggregates', label: 'Soil, mulch and aggregates' },
  { key: 'turf-seed', label: 'Turf, seed and turf care' },
  { key: 'trees', label: 'Trees' },
  { key: 'shrubs', label: 'Shrubs' },
  { key: 'hedging', label: 'Hedging' },
  { key: 'perennials', label: 'Perennials' },
  { key: 'grasses', label: 'Grasses' },
  { key: 'herbaceous', label: 'Herbaceous plants' },
  { key: 'bulbs', label: 'Bulbs' },
  { key: 'plugs', label: 'Plugs and young plants' },
  { key: 'topiary', label: 'Topiary' },
  { key: 'specimen', label: 'Specimen plants' },
  { key: 'architectural', label: 'Architectural plants' },
  { key: 'fencing-gates', label: 'Fencing and gates' },
  { key: 'sheds', label: 'Sheds, summerhouses and log stores' },
  { key: 'garden-rooms', label: 'Garden rooms and offices' },
  { key: 'paving-stone', label: 'Paving, kerbs and stone' },
  { key: 'landscape-products', label: 'Tree pits, drainage and landscape products' },
  { key: 'artificial-play', label: 'Artificial grass, play and sports surfacing' },
  { key: 'tools-machinery', label: 'Tools, machinery and PPE' },
  { key: 'plant-hire', label: 'Plant and tool hire' },
  { key: 'merchant', label: 'Builders and landscape merchants' },
  { key: 'virtual-assistant', label: 'Virtual assistants and admin support' },
  { key: 'business-development', label: 'Business development and tendering' },
  { key: 'insurance', label: 'Insurance and brokers' },
  { key: 'growing-media', label: 'Growing media, compost and fertilisers' },
  { key: 'bricks-walling', label: 'Bricks, blocks and walling' },
  { key: 'timber-decking', label: 'Timber, sleepers, decking and cladding' },
  { key: 'furniture-planters', label: 'Planters, benches and street furniture' },
  { key: 'lighting-products', label: 'Lighting and electrical products' },
  { key: 'water-products', label: 'Pond, water feature and pump supplies' },
  { key: 'green-roof-systems', label: 'Green roof and living wall systems' },
  { key: 'irrigation-supplies', label: 'Irrigation supplies' },
  { key: 'drainage-products', label: 'Drainage pipes, chambers and geotextiles' },
  { key: 'ecology-products', label: 'Ecology products (bird and bat boxes, habitat)' },
  { key: 'site-welfare', label: 'Site cabins, welfare and portable toilets' },
  { key: 'waste-skips', label: 'Skip hire, waste and recycling' },
  { key: 'pest-services', label: 'Pest control services and products' },
  { key: 'vehicles', label: 'Vans, trailers and vehicle hire' },
  { key: 'workwear', label: 'Workwear, boots and signage' },
  { key: 'recruitment', label: 'Recruitment and labour supply' },
  { key: 'safety-compliance', label: 'Health and safety and accreditation support' },
  { key: 'construction-accountancy', label: 'Construction accountancy, bookkeeping and CIS' },
  { key: 'accounting-finance', label: 'Invoice finance, funding and asset finance' },
  { key: 'legal', label: 'Legal and debt recovery' },
  { key: 'software', label: 'Software, estimating and surveying services' },
  { key: 'marketing', label: 'Websites, marketing and photography' },
];
/** The plant options, each one its own tick box. */
export const PLANT_KEYS = ['trees', 'shrubs', 'hedging', 'perennials', 'grasses', 'herbaceous', 'bulbs', 'plugs', 'topiary', 'specimen', 'architectural'];
/** Before plants were split into separate options there was one: 'trees-plants'. */
export const supplierCategoryLabel = (k: string) => SUPPLIER_CATEGORIES.find((c) => c.key === k)?.label ?? (k === 'trees-plants' ? 'Trees, shrubs and hedging' : k);
/** Does a supplier cover this estimate category? A plant line is covered by any plant option. */
export const coversCategory = (supplierCats: string[], cat: string) =>
  cat === 'trees-plants' ? supplierCats.some((k) => k === 'trees-plants' || PLANT_KEYS.includes(k)) : supplierCats.includes(cat);

export const HELP_KINDS: { key: string; label: string }[] = [
  { key: 'labour', label: 'Extra hands or a gang' },
  { key: 'subcontract', label: 'Subcontract a package' },
  { key: 'finish', label: 'Help finishing a job' },
  { key: 'plant', label: 'Machine or operator' },
  { key: 'cover', label: 'Holiday or sickness cover' },
  { key: 'other', label: 'Something else' },
];
export const helpKindLabel = (k: string) => HELP_KINDS.find((c) => c.key === k)?.label ?? k;

export function miles(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(r(bLat - aLat) / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLng - aLng) / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

export const cleanUrl = (u: string | null | undefined) => {
  const s = (u ?? '').trim();
  if (!s) return null;
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const url = new URL(withScheme);
    return /^https?:$/.test(url.protocol) && url.hostname.includes('.') ? url.toString() : null;
  } catch {
    return null;
  }
};
export const shortUrl = (u: string) => u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
