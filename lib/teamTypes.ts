// Cards, tickets and courses for the team and training records. Shared by server and browser code.
// `key` is stored on each record, so never rename a key once used.

export type QualType = {
  key: string;
  label: string;
  group: string;
  /** Usual validity in years, used to work out the expiry when only the pass date is given. */
  years: number | null;
  /** Placeholder for the detail box: colour, category or level. */
  detail?: string;
};

export const QUAL_TYPES: QualType[] = [
  { key: 'cscs', label: 'CSCS card', group: 'Site cards', years: 5, detail: 'e.g. Green labourer, Blue skilled worker, Gold supervisor' },
  { key: 'liss', label: 'LISS/CSCS card (land-based)', group: 'Site cards', years: 5, detail: 'e.g. Operative, Skilled worker, Supervisor, Manager' },
  { key: 'cpcs', label: 'CPCS card', group: 'Plant', years: 5, detail: 'Category, e.g. A59 360 excavator, A09 dumper' },
  { key: 'npors', label: 'NPORS card', group: 'Plant', years: 5, detail: 'Category, e.g. N729 excavator, N204 dumper' },
  { key: 'lantra_plant', label: 'Lantra plant or machinery', group: 'Plant', years: null, detail: 'e.g. Ride-on mower, Compact tractor, Mini digger' },
  { key: 'pa1', label: 'PA1 pesticides foundation', group: 'Pesticides', years: null },
  { key: 'pa6', label: 'PA6 hand-held applicator', group: 'Pesticides', years: null, detail: 'e.g. PA6A, PA6AW, PA6W' },
  { key: 'pa2', label: 'PA2 boom sprayer', group: 'Pesticides', years: null },
  { key: 'nroso', label: 'NRoSO membership', group: 'Pesticides', years: 1 },
  { key: 'chainsaw', label: 'Chainsaw', group: 'Tools and trees', years: null, detail: 'e.g. CS30 maintenance and crosscutting, CS31 felling' },
  { key: 'brushcutter', label: 'Brushcutter and trimmer', group: 'Tools and trees', years: null },
  { key: 'hedge', label: 'Hedge cutting', group: 'Tools and trees', years: null },
  { key: 'tree_climb', label: 'Tree climbing and aerial rescue', group: 'Tools and trees', years: null },
  { key: 'abrasive', label: 'Abrasive wheels', group: 'Tools and trees', years: null },
  { key: 'sssts', label: 'SSSTS site supervisor', group: 'Supervision', years: 5 },
  { key: 'smsts', label: 'SMSTS site manager', group: 'Supervision', years: 5 },
  { key: 'faw', label: 'First aid at work', group: 'First aid', years: 3 },
  { key: 'efaw', label: 'Emergency first aid at work', group: 'First aid', years: 3 },
  { key: 'mhfa', label: 'Mental health first aid', group: 'First aid', years: 3 },
  { key: 'asbestos', label: 'Asbestos awareness', group: 'Awareness', years: 1 },
  { key: 'manual', label: 'Manual handling', group: 'Awareness', years: null },
  { key: 'height', label: 'Working at height', group: 'Awareness', years: null },
  { key: 'fire', label: 'Fire marshal', group: 'Awareness', years: 3 },
  { key: 'nrswa', label: 'Street works (NRSWA)', group: 'Highways', years: 5, detail: 'Units, e.g. Operative units 1, 2, 4' },
  { key: 'traffic', label: 'Traffic management', group: 'Highways', years: 5, detail: 'e.g. Lantra 12D T1/T2, NHSS 12A/B' },
  { key: 'catgenny', label: 'CAT and Genny', group: 'Highways', years: 3 },
  { key: 'ipaf', label: 'IPAF (MEWPs)', group: 'Access', years: 5, detail: 'Categories, e.g. 1b, 3a' },
  { key: 'pasma', label: 'PASMA towers', group: 'Access', years: 5 },
  { key: 'qualification', label: 'Qualification (NVQ, diploma, degree)', group: 'Other', years: null, detail: 'e.g. NVQ Level 2 Horticulture' },
  { key: 'other', label: 'Other', group: 'Other', years: null, detail: 'Name of the card or course' },
];

export const qualType = (key: string) => QUAL_TYPES.find((q) => q.key === key);
export const qualLabel = (key: string) => qualType(key)?.label ?? key;
export const QUAL_GROUPS = [...new Set(QUAL_TYPES.map((q) => q.group))];

/** Reminders go out this many days before expiry, so there is time to book a course. */
export const TEAM_WARN_DAYS = 60;

export type QualStatus = { tone: 'ok' | 'warn' | 'bad' | 'none'; label: string };

const dayMs = 86_400_000;
export const daysLeft = (d: string, now = new Date()) =>
  Math.ceil((Date.parse(`${d}T00:00:00Z`) - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) / dayMs);

export function qualStatus(expiry: string | null): QualStatus {
  if (!expiry) return { tone: 'none', label: 'No expiry' };
  const d = daysLeft(expiry);
  if (d < 0) return { tone: 'bad', label: 'Expired' };
  if (d <= TEAM_WARN_DAYS) return { tone: 'warn', label: d === 0 ? 'Expires today' : `Expires in ${d} day${d === 1 ? '' : 's'}` };
  return { tone: 'ok', label: 'In date' };
}

/** Expiry worked out from the pass date when the card has a usual lifetime. */
export function impliedExpiry(type: string, achieved: string | null): string | null {
  const years = qualType(type)?.years;
  if (!years || !achieved) return null;
  const d = new Date(`${achieved}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Display name for one record, e.g. "CSCS card (Blue skilled worker)". */
export const qualName = (q: { qual_type: string; detail: string | null }) =>
  q.qual_type === 'other' && q.detail ? q.detail : `${qualLabel(q.qual_type)}${q.detail ? ` (${q.detail})` : ''}`;
