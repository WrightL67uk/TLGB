// Shared lists for the supplier directory and help board.

export const SUPPLIER_CATEGORIES: { key: string; label: string }[] = [
  { key: 'soil-aggregates', label: 'Soil, mulch and aggregates' },
  { key: 'turf-seed', label: 'Turf, seed and turf care' },
  { key: 'trees-plants', label: 'Trees, shrubs and hedging' },
  { key: 'fencing-gates', label: 'Fencing and gates' },
  { key: 'paving-stone', label: 'Paving, kerbs and stone' },
  { key: 'landscape-products', label: 'Tree pits, drainage and landscape products' },
  { key: 'artificial-play', label: 'Artificial grass, play and sports surfacing' },
  { key: 'tools-machinery', label: 'Tools, machinery and PPE' },
  { key: 'plant-hire', label: 'Plant and tool hire' },
  { key: 'merchant', label: 'Builders and landscape merchants' },
];
export const supplierCategoryLabel = (k: string) => SUPPLIER_CATEGORIES.find((c) => c.key === k)?.label ?? k;

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
