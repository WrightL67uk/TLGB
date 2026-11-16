// Questions and labels for soil suppliers. Plain data, so browser and server code can both use it.

export const SOIL_PRODUCTS = [
  { key: 'topsoil-gp', label: 'General purpose topsoil (BS 3882)' },
  { key: 'topsoil-premium', label: 'Premium or multipurpose topsoil (BS 3882)' },
  { key: 'topsoil-low', label: 'Low fertility topsoil (BS 3882)' },
  { key: 'subsoil', label: 'Subsoil (BS 8601)' },
  { key: 'tree-pit', label: 'Tree pit or structural soil' },
  { key: 'planting-mix', label: 'Blended planting mixes and manufactured soil' },
  { key: 'recycled', label: 'Recycled or site-won soil' },
  { key: 'compost', label: 'Compost and soil conditioner (PAS 100)' },
  { key: 'rootzone', label: 'Sports and rootzone sand' },
];

export const SOIL_SOURCES = [
  { key: 'virgin', label: 'Natural soil stripped from known sites' },
  { key: 'manufactured', label: 'Manufactured or blended by us' },
  { key: 'recycled', label: 'Recycled or processed from other sites' },
  { key: 'imported', label: 'Imported from other suppliers' },
];

export const SOIL_FREQ = [
  { key: 'every-batch', label: 'Every batch or load is tested' },
  { key: 'per-stockpile', label: 'Every stockpile is tested before it is sold' },
  { key: 'annual', label: 'At least once a year' },
  { key: 'on-request', label: 'Only when a customer asks' },
  { key: 'never', label: 'We do not test' },
];

export const SOIL_TESTS = [
  { key: 'bs3882-suite', label: 'Full BS 3882 suite' },
  { key: 'particle', label: 'Particle size and stone content' },
  { key: 'ph-om', label: 'pH and organic matter' },
  { key: 'nutrients', label: 'Nutrients (N, P, K, Mg)' },
  { key: 'metals', label: 'Heavy metals and contaminants' },
  { key: 'conductivity', label: 'Conductivity or salinity' },
  { key: 'weed-seed', label: 'Weed seed or germination' },
];

export const SOIL_TICKET_FIELDS = [
  { key: 'product', label: 'Product and British Standard grade' },
  { key: 'source', label: 'Source site or origin' },
  { key: 'batch', label: 'Stockpile or batch number' },
  { key: 'test-date', label: 'Date of the latest test' },
  { key: 'quantity', label: 'Quantity (tonnes or m³)' },
  { key: 'vehicle', label: 'Vehicle registration' },
  { key: 'waste', label: 'Waste transfer or duty of care details' },
];

export const SOIL_LOADS = [
  { key: 'bulk-bag', label: 'Bulk bags' },
  { key: 'small-tipper', label: 'Small tipper (6 to 8 tonne)' },
  { key: 'eight-wheeler', label: '8-wheeler (up to about 20 tonne)' },
  { key: 'artic', label: 'Artic or walking floor (up to about 29 tonne)' },
];

export type Tri = 'yes' | 'some' | 'no' | 'na';
export type Soil = {
  products: string[]; bs3882: Tri | ''; bs8601: Tri | ''; sources: string[]; source_note: string;
  test_freq: string; lab: string; ukas: boolean | null; tests: string[];
  tickets: boolean | null; ticket_fields: string[]; cert_with_order: 'always' | 'request' | 'no' | ''; batch_traceable: boolean | null;
  weeds: boolean | null; permit_ref: string; carrier_ref: string;
  loads: string[]; lead_time: string; inspect: boolean | null; notes: string;
};

export const EMPTY_SOIL: Soil = {
  products: [], bs3882: '', bs8601: '', sources: [], source_note: '', test_freq: '', lab: '', ukas: null, tests: [],
  tickets: null, ticket_fields: [], cert_with_order: '', batch_traceable: null, weeds: null, permit_ref: '', carrier_ref: '',
  loads: [], lead_time: '', inspect: null, notes: '',
};

export const DOC_KINDS = [
  { key: 'stockpile-test', label: 'Stockpile or batch test results' },
  { key: 'bs-certificate', label: 'BS 3882 / BS 8601 certificate' },
  { key: 'permit', label: 'Permit, exemption or waste carrier registration' },
  { key: 'sample-ticket', label: 'Sample delivery ticket' },
  { key: 'other', label: 'Something else' },
];
export const docKindLabel = (k: string) => DOC_KINDS.find((d) => d.key === k)?.label ?? k;

export const labelOf = (list: { key: string; label: string }[], k: string) => list.find((x) => x.key === k)?.label ?? k;
export const TRI_LABEL: Record<string, string> = { yes: 'Yes, all of it', some: 'Some of it', no: 'No', na: 'Not supplied' };
export const isSoilSupplier = (categories: string[] | null | undefined) => (categories ?? []).includes('soil-aggregates');

export function cleanSoil(raw: unknown): Soil {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const arr = (v: unknown, allowed: { key: string }[]) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && allowed.some((a) => a.key === x)) : []);
  const txt = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
  const bool = (v: unknown) => (v === true ? true : v === false ? false : null);
  const tri = (v: unknown): Tri | '' => (v === 'yes' || v === 'some' || v === 'no' || v === 'na' ? v : '');
  return {
    products: arr(r.products, SOIL_PRODUCTS), bs3882: tri(r.bs3882), bs8601: tri(r.bs8601), sources: arr(r.sources, SOIL_SOURCES),
    source_note: txt(r.source_note, 300), test_freq: SOIL_FREQ.some((f) => f.key === r.test_freq) ? (r.test_freq as string) : '',
    lab: txt(r.lab, 120), ukas: bool(r.ukas), tests: arr(r.tests, SOIL_TESTS), tickets: bool(r.tickets),
    ticket_fields: arr(r.ticket_fields, SOIL_TICKET_FIELDS),
    cert_with_order: r.cert_with_order === 'always' || r.cert_with_order === 'request' || r.cert_with_order === 'no' ? r.cert_with_order : '',
    batch_traceable: bool(r.batch_traceable), weeds: bool(r.weeds), permit_ref: txt(r.permit_ref, 120), carrier_ref: txt(r.carrier_ref, 60),
    loads: arr(r.loads, SOIL_LOADS), lead_time: txt(r.lead_time, 120), inspect: bool(r.inspect), notes: txt(r.notes, 600),
  };
}

/** What must be filled in before it can be sent for checking. Returns a message, or null when complete. */
export function soilProblem(s: Soil, docCount: number): string | null {
  if (!s.products.length) return 'Tick the soil products you supply.';
  if (!s.bs3882) return 'Tell us whether your topsoil is certified to BS 3882.';
  if (!s.test_freq) return 'Tell us how often your stockpiles are tested.';
  if (s.tickets === null) return 'Tell us whether you issue a delivery ticket with each load.';
  if (!s.cert_with_order) return 'Tell us whether buyers get a test certificate with their order.';
  if (!docCount) return 'Upload at least one recent test certificate or stockpile result for us to check.';
  return null;
}

/** The lines shown to buyers once a supplier is checked. */
export function soilLines(s: Soil): [string, string][] {
  const out: [string, string][] = [];
  if (s.products.length) out.push(['Soil supplied', s.products.map((k) => labelOf(SOIL_PRODUCTS, k)).join('; ')]);
  if (s.bs3882 && s.bs3882 !== 'na') out.push(['Topsoil to BS 3882', TRI_LABEL[s.bs3882]]);
  if (s.bs8601 && s.bs8601 !== 'na') out.push(['Subsoil to BS 8601', TRI_LABEL[s.bs8601]]);
  if (s.sources.length) out.push(['Where it comes from', s.sources.map((k) => labelOf(SOIL_SOURCES, k)).join('; ') + (s.source_note ? `. ${s.source_note}` : '')]);
  if (s.test_freq) out.push(['Testing', labelOf(SOIL_FREQ, s.test_freq)]);
  if (s.lab) out.push(['Tested by', s.lab + (s.ukas ? ' (UKAS accredited)' : '')]);
  if (s.tests.length) out.push(['Tests cover', s.tests.map((k) => labelOf(SOIL_TESTS, k)).join('; ')]);
  if (s.tickets !== null) out.push(['Delivery tickets', s.tickets ? `Issued with every load${s.ticket_fields.length ? `: ${s.ticket_fields.map((k) => labelOf(SOIL_TICKET_FIELDS, k)).join('; ')}` : ''}` : 'Not issued']);
  if (s.cert_with_order) out.push(['Test certificate', ({ always: 'Sent with every order', request: 'Supplied on request', no: 'Not supplied' } as Record<string, string>)[s.cert_with_order]]);
  if (s.batch_traceable) out.push(['Traceability', 'Each load can be traced back to its stockpile and test result']);
  if (s.weeds) out.push(['Weeds', 'Screened for invasive weeds such as Japanese knotweed']);
  if (s.permit_ref) out.push(['Permit or exemption', s.permit_ref]);
  if (s.carrier_ref) out.push(['Waste carrier registration', s.carrier_ref]);
  if (s.loads.length) out.push(['Load sizes', s.loads.map((k) => labelOf(SOIL_LOADS, k)).join('; ')]);
  if (s.lead_time) out.push(['Lead time', s.lead_time]);
  if (s.inspect !== null) out.push(['Stockpile visits', s.inspect ? 'Customers can inspect and sample stockpiles' : 'By arrangement only']);
  return out;
}
