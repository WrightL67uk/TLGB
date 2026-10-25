// Options for job seeker profiles. Shared by server and browser code.
// Keys are stored on profiles, so never rename a key once used.

export type Opt = { key: string; label: string };

export const LEVELS: Opt[] = [
  { key: 'apprentice', label: 'Apprentice or trainee' },
  { key: 'labourer', label: 'Labourer' },
  { key: 'operative', label: 'Landscape operative' },
  { key: 'skilled', label: 'Skilled operative or tradesperson' },
  { key: 'machine', label: 'Plant or machine operator' },
  { key: 'chargehand', label: 'Chargehand or team leader' },
  { key: 'supervisor', label: 'Supervisor or foreman' },
  { key: 'manager', label: 'Site, contracts or project manager' },
  { key: 'office', label: 'Estimator, QS, designer or office role' },
];

export const SKILL_GROUPS: { group: string; items: Opt[] }[] = [
  { group: 'Soft landscaping', items: [
    { key: 'planting', label: 'Shrub and herbaceous planting' },
    { key: 'trees', label: 'Tree planting, staking and pits' },
    { key: 'hedging', label: 'Hedging and whips' },
    { key: 'turf', label: 'Turfing' },
    { key: 'seeding', label: 'Seeding and hydroseeding' },
    { key: 'wildflower', label: 'Wildflower and meadows' },
    { key: 'topsoil', label: 'Topsoiling and cultivation' },
    { key: 'mulch', label: 'Mulching and bark' },
    { key: 'green_roof', label: 'Green roofs and living walls' },
    { key: 'rear_gardens', label: 'Plot and rear garden finishing' },
  ] },
  { group: 'Hard landscaping', items: [
    { key: 'paving', label: 'Paving and patios' },
    { key: 'block_paving', label: 'Block paving' },
    { key: 'natural_stone', label: 'Natural stone' },
    { key: 'kerbs', label: 'Kerbs and edgings' },
    { key: 'walls', label: 'Walling and brickwork' },
    { key: 'decking', label: 'Decking and timber' },
    { key: 'resin', label: 'Resin and bound surfaces' },
    { key: 'fencing', label: 'Fencing and gates' },
    { key: 'play', label: 'Play equipment and safety surfacing' },
    { key: 'street_furniture', label: 'Street furniture and bins' },
  ] },
  { group: 'Groundworks and drainage', items: [
    { key: 'groundworks', label: 'Groundworks and excavation' },
    { key: 'drainage', label: 'Drainage' },
    { key: 'suds', label: 'SuDS, swales and attenuation' },
    { key: 'irrigation', label: 'Irrigation' },
    { key: 'levels', label: 'Setting out and levels' },
  ] },
  { group: 'Maintenance and trees', items: [
    { key: 'grounds', label: 'Grounds maintenance' },
    { key: 'mowing', label: 'Mowing and strimming' },
    { key: 'hedge_cutting', label: 'Hedge cutting' },
    { key: 'pruning', label: 'Pruning and shrub care' },
    { key: 'weed_control', label: 'Weed control and spraying' },
    { key: 'arb', label: 'Tree surgery and arboriculture' },
    { key: 'invasive', label: 'Invasive weeds (for example Japanese knotweed)' },
    { key: 'winter', label: 'Gritting and winter maintenance' },
    { key: 'watering', label: 'Watering and aftercare' },
  ] },
  { group: 'Machinery', items: [
    { key: 'mini_digger', label: 'Mini digger (under 3t)' },
    { key: 'excavator', label: '360 excavator' },
    { key: 'dumper', label: 'Dumper' },
    { key: 'telehandler', label: 'Telehandler' },
    { key: 'tractor', label: 'Tractor and attachments' },
    { key: 'ride_on', label: 'Ride-on mowers' },
  ] },
  { group: 'Management and office', items: [
    { key: 'drawings', label: 'Reading landscape drawings' },
    { key: 'running_team', label: 'Running a team' },
    { key: 'site_management', label: 'Site management' },
    { key: 'paperwork', label: 'RAMS, permits and site paperwork' },
    { key: 'estimating', label: 'Estimating and pricing' },
    { key: 'quantity_surveying', label: 'Valuations and quantity surveying' },
    { key: 'design', label: 'Garden or landscape design' },
    { key: 'ecology', label: 'Ecology and habitat creation (BNG)' },
    { key: 'customer', label: 'Dealing with customers and residents' },
  ] },
];
export const SKILLS = SKILL_GROUPS.flatMap((g) => g.items);

export const LICENCES: Opt[] = [
  { key: 'B', label: 'Car (B)' },
  { key: 'BE', label: 'Car and trailer (B+E)' },
  { key: 'C1', label: '7.5 tonne (C1)' },
  { key: 'C1E', label: '7.5 tonne and trailer (C1+E)' },
  { key: 'C', label: 'HGV (C)' },
  { key: 'tractor', label: 'Tractor (F)' },
];

export const VEHICLE: Opt[] = [
  { key: 'own', label: 'Have my own vehicle' },
  { key: 'own_van', label: 'Have my own van' },
  { key: 'required', label: 'Need a work vehicle' },
  { key: 'open', label: 'Open to discussion' },
  { key: 'none', label: 'No vehicle, can get to site' },
];

export const TOOLS: Opt[] = [
  { key: 'own', label: 'Have my own tools' },
  { key: 'hand', label: 'Have hand tools only' },
  { key: 'required', label: 'Tools needed' },
  { key: 'open', label: 'Open to discussion' },
];

export const WORK_TYPES: Opt[] = [
  { key: 'full_time', label: 'Full-time employed' },
  { key: 'part_time', label: 'Part-time employed' },
  { key: 'self_employed', label: 'Self-employed or CIS' },
  { key: 'day_rate', label: 'Day rate' },
  { key: 'temp', label: 'Temporary or seasonal' },
  { key: 'agency', label: 'Through an agency' },
  { key: 'apprenticeship', label: 'Apprenticeship' },
  { key: 'weekends', label: 'Weekend or evening work' },
];

export const PAY_PERIODS: Opt[] = [
  { key: 'hour', label: 'an hour' },
  { key: 'day', label: 'a day' },
  { key: 'week', label: 'a week' },
  { key: 'month', label: 'a month' },
  { key: 'year', label: 'a year' },
];

export const label = (list: Opt[], key: string | null | undefined) => list.find((o) => o.key === key)?.label ?? null;
export const skillLabel = (key: string) => label(SKILLS, key) ?? key;

/** Profiles stay on the board this long, then the seeker is asked to renew. */
export const SEEKER_LIVE_DAYS = 60;

const gbp = (n: number) => `£${n.toLocaleString('en-GB', { maximumFractionDigits: n < 100 ? 2 : 0 })}`;

export function payText(p: { pay_min: number | null; pay_max: number | null; pay_period: string | null }) {
  if (p.pay_min == null && p.pay_max == null) return null;
  const per = label(PAY_PERIODS, p.pay_period) ?? '';
  const lo = p.pay_min != null ? Number(p.pay_min) : null;
  const hi = p.pay_max != null ? Number(p.pay_max) : null;
  const amount = lo != null && hi != null && hi !== lo ? `${gbp(lo)} to ${gbp(hi)}` : lo != null ? (hi == null ? `From ${gbp(lo)}` : gbp(lo)) : `Up to ${gbp(hi!)}`;
  return `${amount} ${per}`.trim();
}

/** Free to start now: no start date, or one that has passed. */
export const availableNow = (s: { available_from: string | null }) => !s.available_from || s.available_from <= new Date().toISOString().slice(0, 10);
