// Starter documents members can download from empty slots in their compliance pack.
// Square brackets mark what the member must fill in. Kept plain so they open in any word processor.

export type Block =
  | { h: string }
  | { p: string }
  | { list: string[] }
  | { table: { head: string[]; rows: string[][] } };

export type Template = { slug: string; title: string; note: string; blocks: Block[] };

const SIGN: Block[] = [
  { h: 'Approval and review' },
  { p: 'This document is reviewed at least once a year, and sooner if the business, the law or the way we work changes.' },
  { table: { head: ['Signed', 'Name', 'Position', 'Date', 'Next review'], rows: [['', '[Name]', '[Director / Owner]', '[Date]', '[Date + 12 months]']] } },
];

export const TEMPLATES: Template[] = [
  {
    slug: 'health-and-safety-policy',
    title: 'Health and Safety Policy',
    note: 'If you employ five or more people, the law requires a written health and safety policy. Contractors will ask for it whatever your size.',
    blocks: [
      { h: '1. Statement of intent' },
      { p: '[Company name] is committed to the health, safety and welfare of our employees, subcontractors, clients and members of the public affected by our work. We will comply with the Health and Safety at Work etc. Act 1974, the Management of Health and Safety at Work Regulations 1999, the Construction (Design and Management) Regulations 2015 and other relevant law, and we aim to go beyond the minimum where we reasonably can.' },
      { p: 'We will:' },
      { list: [
        'assess the risks of our work and put sensible controls in place before work starts',
        'provide and maintain safe plant, equipment and methods of work',
        'give our people the information, instruction, training and supervision they need',
        'consult our workers on health and safety matters',
        'provide suitable personal protective equipment (PPE) free of charge',
        'report accidents and incidents and learn from them',
        'review this policy and our performance at least once a year',
      ] },
      { h: '2. Responsibilities' },
      { table: { head: ['Role', 'Name', 'Responsible for'], rows: [
        ['Overall responsibility', '[Name, Director]', 'This policy, resources and making sure it is followed'],
        ['Day to day responsibility', '[Name, Contracts / Site Manager]', 'Risk assessments, method statements, site inductions, supervision'],
        ['Competent health and safety advice', '[Name or external adviser]', 'Advice on legal duties and good practice'],
        ['First aid', '[Name(s)]', 'First aid kits, first aid at work cover on each site'],
        ['All employees', 'Everyone', 'Working safely, following instructions and RAMS, reporting hazards and near misses'],
      ] } },
      { h: '3. Arrangements' },
      { p: '<b>Risk assessment and method statements.</b> We prepare a risk assessment and method statement (RAMS) for each job or type of work, brief it to the team before work starts and keep a signed record. We follow the principal contractor\'s site rules and construction phase plan.' },
      { p: '<b>Training and competence.</b> Operatives hold a CSCS card (or equivalent) for their role. Plant is only operated by people with a valid CPCS, NPORS or equivalent ticket. Training records are kept in our training matrix.' },
      { p: '<b>Plant and equipment.</b> Equipment is maintained, inspected before use and serviced in line with the manufacturer\'s instructions (PUWER 1998). Lifting equipment is thoroughly examined as required by LOLER 1998.' },
      { p: '<b>Hazardous substances.</b> We hold a COSHH assessment for every hazardous product we use, including herbicides, fuels and cement-based products. Pesticides are only applied by people holding the correct certificates.' },
      { p: '<b>Manual handling, noise and vibration.</b> We plan work to reduce lifting by hand, use mechanical aids where we can, and manage noise and hand-arm vibration exposure from tools such as strimmers, breakers and plate compactors.' },
      { p: '<b>Underground services.</b> Before any digging we check service drawings and scan with a cable avoidance tool (CAT and Genny) operated by a trained person.' },
      { p: '<b>Welfare.</b> Suitable toilets, washing facilities, drinking water and a place to eat and shelter are available on every site, either our own or the principal contractor\'s.' },
      { p: '<b>Accidents and incidents.</b> All accidents and near misses are recorded and investigated. Reportable incidents are reported under RIDDOR 2013.' },
      { p: '<b>Lone working and the public.</b> Lone working is planned and checked in. Work areas next to the public are fenced or coned off and signed.' },
      { p: '<b>Monitoring.</b> Managers carry out regular site inspections and we review accidents, near misses and inspection findings at least every [three] months.' },
      ...SIGN,
    ],
  },
  {
    slug: 'rams-soft-landscaping',
    title: 'Risk Assessment and Method Statement: Soft Landscaping and Tree Planting',
    note: 'Edit this for each job. A contractor will want to see the site address, programme and names filled in, not a generic copy.',
    blocks: [
      { h: 'Job details' },
      { table: { head: ['Item', 'Details'], rows: [
        ['Client / principal contractor', '[Name]'], ['Site address', '[Address]'], ['Work covered', 'Topsoil spreading, cultivation, planting of trees, shrubs and hedges, turfing, seeding, mulching, watering'],
        ['Programme', '[Start date] to [finish date]'], ['Supervisor on site', '[Name, phone]'], ['First aider', '[Name]'], ['Nearest A&E', '[Hospital, address]'], ['RAMS prepared by', '[Name, date]'],
      ] } },
      { h: 'Method statement' },
      { list: [
        'Attend the principal contractor\'s site induction. Brief this RAMS to all operatives before starting and record signatures.',
        'Confirm the work area, access routes, storage area and any restrictions with the site manager. Check service drawings for the work area.',
        'Set out planting areas and tree pit positions from the approved landscape drawings. Scan tree pit locations with a CAT and Genny before digging.',
        'Deliveries of topsoil, plants and materials are received in the agreed area. Banksman used for all reversing vehicles and plant.',
        'Spread and level topsoil to the specified depth using [excavator / dumper / by hand]. Cultivate to the specification.',
        'Excavate tree pits to the specified size by [mini excavator / hand]. Install root barrier, irrigation pipe and underground or above-ground guying as specified.',
        'Plant trees, firm in, stake or guy and tie. Plant shrubs and hedges to the specified densities. Apply mulch to the specified depth.',
        'Lay turf or sow seed to the specification. Water in all planting.',
        'Clear the work area daily. Waste is removed by a registered waste carrier with waste transfer notes kept.',
        'Hand over to the client with as-built information and aftercare instructions.',
      ] },
      { h: 'Risk assessment' },
      { p: 'Risk ratings: L = low, M = medium, H = high, after controls.' },
      { table: { head: ['Hazard', 'Who could be harmed', 'Controls', 'Risk'], rows: [
        ['Moving plant and vehicles', 'Operatives, others on site, public', 'Trained and ticketed operators, banksman for reversing, exclusion zones, high visibility clothing, pedestrian routes kept separate', 'M'],
        ['Striking underground services', 'Operatives', 'Service drawings checked, CAT and Genny scan by a trained person, hand dig within 500mm of a located service', 'M'],
        ['Manual handling (root balls, turf, bags)', 'Operatives', 'Mechanical lifting for large root balls, team lifts, manual handling training, keep loads close', 'M'],
        ['Hand tools and power tools', 'Operatives', 'Tools in good condition, guards fitted, training, gloves and eye protection', 'L'],
        ['Noise and vibration (breakers, compactors)', 'Operatives', 'Low-vibration tools, job rotation, exposure times recorded, hearing protection', 'L'],
        ['Hazardous substances (herbicide, fuel)', 'Operatives, public', 'COSHH assessments, certified operators for pesticides, correct PPE, safe storage', 'L'],
        ['Open excavations (tree pits)', 'Operatives, others on site, public', 'Pits covered or barriered at the end of each day, plant tree on the day dug where possible', 'M'],
        ['Slips, trips and falls', 'Operatives, others', 'Good housekeeping, materials stored neatly, clear walkways', 'L'],
        ['Weather (heat, cold, wet)', 'Operatives', 'Water, shade and sun cream in heat, warm and waterproof clothing, stop work in high winds or lightning', 'L'],
        ['Working near the public', 'Public', 'Work area fenced or coned and signed, no plant movements without a banksman', 'M'],
        ['Soil and plant material (bacteria, irritants)', 'Operatives', 'Gloves, washing facilities, cuts covered, tetanus awareness', 'L'],
      ] } },
      { h: 'PPE required' },
      { p: 'Safety boots, high visibility clothing, gloves, safety glasses. Hard hat on construction sites. Hearing protection when using noisy plant or tools.' },
      { h: 'Briefing record' },
      { table: { head: ['Name', 'CSCS card number', 'Signature', 'Date'], rows: [['', '', '', ''], ['', '', '', ''], ['', '', '', '']] } },
    ],
  },
  {
    slug: 'coshh-assessment',
    title: 'COSHH Assessment',
    note: 'Fill in one of these for each hazardous product. The safety data sheet from your supplier has most of what you need.',
    blocks: [
      { table: { head: ['Item', 'Details'], rows: [
        ['Product name', '[e.g. glyphosate-based herbicide, trade name]'], ['Supplier', '[Name]'], ['Safety data sheet date', '[Date]'],
        ['What it is used for', '[e.g. weed control on hard surfaces and planting beds]'], ['How it is used', '[e.g. knapsack sprayer, diluted per label]'],
        ['How much and how often', '[e.g. up to 15 litres diluted per day, seasonal]'], ['Hazard classification', '[From section 2 of the safety data sheet]'],
      ] } },
      { h: 'Routes of exposure' },
      { list: ['Skin contact: [yes / no]', 'Eyes: [yes / no]', 'Breathing in spray, dust or vapour: [yes / no]', 'Swallowing: [unlikely if hygiene rules followed]'] },
      { h: 'Controls' },
      { list: [
        'Only used by people trained and, for pesticides, holding the correct certificate (e.g. PA1 and PA6).',
        'Follow the product label and safety data sheet at all times.',
        'Avoid spraying in wind or when rain is forecast. Keep away from watercourses and drains.',
        'Store locked away in the original container, away from food and drink.',
        'Wash hands before eating, drinking or smoking.',
      ] },
      { h: 'PPE' },
      { p: '[e.g. nitrile gloves, coveralls, face shield or goggles, wellington boots, as stated in section 8 of the safety data sheet]' },
      { h: 'First aid' },
      { list: ['Skin: wash with plenty of water.', 'Eyes: rinse with clean water for at least 10 minutes, seek medical advice.', 'Swallowed: do not make the person sick, seek medical advice and show the label.'] },
      { h: 'Spills and disposal' },
      { p: 'Contain spills with absorbent material. Dispose of waste product and empty containers through a licensed waste contractor. Never pour into drains.' },
      { h: 'Health surveillance required' },
      { p: '[Yes / No]' },
      { table: { head: ['Assessed by', 'Date', 'Review date'], rows: [['[Name]', '[Date]', '[Date + 12 months]']] } },
    ],
  },
  {
    slug: 'environmental-policy',
    title: 'Environmental Policy',
    note: 'Keep it true to how you work. Contractors will ask for evidence of anything you claim here, such as waste transfer notes.',
    blocks: [
      { p: '[Company name] provides [landscaping and external works services]. We recognise that our work affects the environment and we are committed to reducing that impact and to protecting and improving the natural environment we work in.' },
      { p: 'We will:' },
      { list: [
        'comply with all environmental law that applies to us, including our duty of care for waste under the Environmental Protection Act 1990',
        'only use registered waste carriers and keep waste transfer notes, and hold our own waste carrier registration where we carry waste',
        'reduce, reuse and recycle waste, including green waste, soil and packaging',
        'prevent pollution: store fuels and chemicals safely, carry spill kits and protect drains and watercourses',
        'use pesticides only when needed, by certified operators, following the label',
        'protect existing trees, habitats and wildlife on our sites and avoid clearing vegetation during the bird nesting season without a check by a competent person',
        'choose peat-free growing media and responsibly sourced timber (FSC or PEFC) where we can',
        'reduce fuel use through route planning, maintaining vehicles and plant, and moving to lower-emission equipment over time',
        'train our people so they understand their part in this policy',
        'set environmental objectives and review our progress each year',
      ] },
      ...SIGN,
    ],
  },
  {
    slug: 'quality-policy',
    title: 'Quality Policy',
    note: 'A short, honest policy is better than a long one you do not follow.',
    blocks: [
      { p: '[Company name] aims to deliver work that meets the specification, on programme, safely and to a standard our clients are proud of.' },
      { p: 'To do this we will:' },
      { list: [
        'understand the client\'s requirements and the specification before work starts, and raise questions early',
        'use competent, trained people and suitable plant and materials',
        'source plants and materials from reputable suppliers and check deliveries against the specification',
        'inspect our own work as we go and before handover, and keep records and photographs',
        'provide operation and maintenance information and as-built details at handover',
        'deal with defects promptly during the defects period',
        'listen to feedback, record complaints and use them to improve',
        'review this policy and our performance each year',
      ] },
      ...SIGN,
    ],
  },
  {
    slug: 'modern-slavery-statement',
    title: 'Modern Slavery Statement',
    note: 'Only businesses with turnover of £36m or more must publish a statement under the Modern Slavery Act 2015. Smaller firms often provide a voluntary one because contractors ask for it.',
    blocks: [
      { p: 'This statement sets out the steps [Company name] takes to prevent modern slavery and human trafficking in our business and supply chain. It is made voluntarily.' },
      { h: 'Our business' },
      { p: '[Company name] is a [landscaping / external works] business based in [town] employing [number] people. Our main suppliers are [plant nurseries, aggregate and soil suppliers, merchants, plant hire companies and labour suppliers].' },
      { h: 'Our commitments' },
      { list: [
        'We check every worker\'s right to work in the UK before they start.',
        'We pay at least the National Living Wage and never charge workers fees for finding them work.',
        'We do not hold workers\' identity documents.',
        'We only use labour agencies that are licensed or reputable, and we ask them to confirm they do the same checks.',
        'We expect our suppliers to meet the same standards and will stop working with any that do not.',
        'Our people know how to raise a concern, and can do so without fear of losing their job.',
      ] },
      { h: 'Training and reporting' },
      { p: 'Managers are made aware of the signs of modern slavery. Concerns can be reported to [name, phone] or to the Modern Slavery and Exploitation Helpline on 08000 121 700.' },
      ...SIGN,
    ],
  },
  {
    slug: 'equality-policy',
    title: 'Equality, Diversity and Inclusion Policy',
    note: 'Contractors and public sector clients usually ask for this in their pre-qualification questions.',
    blocks: [
      { p: '[Company name] is committed to equality of opportunity and to a workplace free from discrimination, harassment and bullying. We comply with the Equality Act 2010.' },
      { p: 'We will not discriminate against anyone because of the protected characteristics: age, disability, gender reassignment, marriage and civil partnership, pregnancy and maternity, race, religion or belief, sex and sexual orientation.' },
      { h: 'This applies to' },
      { list: ['recruitment and selection', 'pay, terms and conditions', 'training and promotion', 'discipline and dismissal', 'how we treat clients, subcontractors, suppliers and the public'] },
      { h: 'What we expect' },
      { list: ['Everyone treats colleagues and others with dignity and respect.', 'Harassment, bullying and discriminatory language, including on site and in group chats, are not tolerated and are dealt with under our disciplinary procedure.', 'We make reasonable adjustments for disabled workers and applicants.'] },
      { h: 'Raising a concern' },
      { p: 'Anyone who feels they have been treated unfairly can raise it with [name] or any director. Complaints are taken seriously and handled in confidence.' },
      ...SIGN,
    ],
  },
  {
    slug: 'data-protection-policy',
    title: 'Data Protection (GDPR) Policy',
    note: 'Most businesses that handle personal data also need to pay the data protection fee to the Information Commissioner\'s Office (ICO). Check whether that applies to you.',
    blocks: [
      { p: '[Company name] collects and uses personal data about employees, clients, suppliers and contacts. We follow the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.' },
      { h: 'Our principles' },
      { p: 'Personal data will be:' },
      { list: ['used fairly, lawfully and openly', 'collected only for clear business purposes', 'limited to what we need', 'kept accurate and up to date', 'kept no longer than necessary', 'kept secure'] },
      { h: 'What we hold and why' },
      { table: { head: ['Data', 'Why', 'How long we keep it'], rows: [
        ['Employee records, right to work, bank details', 'Employment, payroll, legal duties', '[6 years after leaving]'],
        ['Training and card details', 'Proving competence to clients', '[While employed + 6 years]'],
        ['Client and supplier contacts', 'Quoting, delivering work, invoicing', '[6 years after last job]'],
        ['Accident records', 'Legal duty, insurance', '[At least 3 years; longer where required]'],
      ] } },
      { h: 'Keeping data secure' },
      { list: ['Devices are password protected and kept up to date.', 'Paper records are kept locked away.', 'Personal data is only shared when needed, for example with our payroll provider or a principal contractor for site access.', 'We do not send copies of workers\' cards or ID more widely than needed.'] },
      { h: 'Rights and breaches' },
      { p: 'People can ask to see the data we hold about them. Requests and any data breaches go to [name], who will respond within one month and report serious breaches to the ICO within 72 hours.' },
      ...SIGN,
    ],
  },
  {
    slug: 'carbon-reduction-plan',
    title: 'Carbon Reduction Plan',
    note: 'Public sector contracts over a set value ask for a Carbon Reduction Plan in a standard government format. Check the latest Cabinet Office guidance if you bid for public work, and use real figures from your fuel and energy bills.',
    blocks: [
      { h: 'Commitment to net zero' },
      { p: '[Company name] is committed to achieving net zero emissions by [2050 or earlier target year].' },
      { h: 'Baseline emissions' },
      { p: 'Baseline year: [year, e.g. our first full year of records]. Emissions are reported in tonnes of carbon dioxide equivalent (tCO2e).' },
      { table: { head: ['Emissions', 'What it covers', 'Baseline tCO2e', 'Current year tCO2e'], rows: [
        ['Scope 1', 'Fuel used in our vans, plant and equipment; gas heating', '[ ]', '[ ]'],
        ['Scope 2', 'Electricity we buy', '[ ]', '[ ]'],
        ['Scope 3', 'Business travel, employee commuting, waste, upstream and downstream transport', '[ ]', '[ ]'],
        ['Total', '', '[ ]', '[ ]'],
      ] } },
      { p: 'Figures are calculated from fuel and energy records using the UK Government greenhouse gas conversion factors for the relevant year.' },
      { h: 'Reduction targets' },
      { p: 'We aim to reduce total emissions to [X] tCO2e by [year], a reduction of [Y]% against our baseline.' },
      { h: 'Measures already in place' },
      { list: ['[e.g. replaced petrol hand tools with battery equipment]', '[e.g. route planning to cut van mileage]', '[e.g. switched to a renewable electricity tariff]', '[e.g. green waste composted rather than landfilled]'] },
      { h: 'Planned measures' },
      { list: ['[e.g. move to electric or hybrid vans as leases end]', '[e.g. driver training and idling policy]', '[e.g. source plants and materials locally where possible]'] },
      { h: 'Declaration and sign off' },
      { p: 'This Carbon Reduction Plan has been completed in line with the relevant government guidance and reporting standard, and has been reviewed and signed off by the board of directors or equivalent management body.' },
      { table: { head: ['Signed', 'Name', 'Position', 'Date'], rows: [['', '[Name]', '[Director]', '[Date]']] } },
    ],
  },
  {
    slug: 'training-matrix',
    title: 'Training Matrix',
    note: 'List who holds which card or ticket and when it expires. Do not upload copies of individual cards: contractors can check card numbers themselves.',
    blocks: [
      { table: { head: ['Name', 'Role', 'CSCS card type', 'Card expiry', 'Plant tickets (CPCS / NPORS)', 'Expiry', 'First aid', 'Expiry', 'Pesticide (PA1/PA6)', 'Other (SMSTS, SSSTS, chainsaw, CAT and Genny)'], rows: [
        ['[Name]', '[Supervisor]', '[e.g. Blue skilled]', '[Date]', '[e.g. 360 excavator A59]', '[Date]', '[First aid at work]', '[Date]', '[Yes / No]', '[SSSTS, CAT and Genny]'],
        ['', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', ''],
      ] } },
      { p: 'Last updated: [date] by [name].' },
    ],
  },
];

export const templateBySlug = (slug: string) => TEMPLATES.find((t) => t.slug === slug);

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
// Paragraph text may contain <b>…</b> only; everything else is escaped.
const rich = (s: string) => esc(s).replace(/&lt;b&gt;/g, '<b>').replace(/&lt;\/b&gt;/g, '</b>');

/** A Word-compatible document (HTML saved as .doc), so members can edit it in Word, Pages or Google Docs. */
export function templateDoc(t: Template, company: string) {
  const fill = (s: string) => (company ? s.replace(/\[Company name\]/g, company) : s);
  const body = t.blocks.map((b) => {
    if ('h' in b) return `<h2>${esc(fill(b.h))}</h2>`;
    if ('p' in b) return `<p>${rich(fill(b.p))}</p>`;
    if ('list' in b) return `<ul>${b.list.map((i) => `<li>${esc(fill(i))}</li>`).join('')}</ul>`;
    return `<table><tr>${b.table.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>${b.table.rows
      .map((r) => `<tr>${r.map((c) => `<td>${esc(fill(c)) || '&nbsp;'}</td>`).join('')}</tr>`).join('')}</table>`;
  }).join('\n');
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(t.title)}</title>
<style>body{font-family:Arial,sans-serif;font-size:11pt;color:#1b1f1c}h1{font-size:18pt;color:#12361f}h2{font-size:13pt;color:#12361f;margin-top:16pt}
table{border-collapse:collapse;width:100%;margin:6pt 0}th,td{border:1px solid #999;padding:4pt 6pt;vertical-align:top;font-size:10pt}th{background:#e9f2e2;text-align:left}
.note{background:#fff4e0;border:1px solid #e0c48a;padding:6pt;font-size:9.5pt}</style></head><body>
<h1>${esc(fill(t.title))}</h1>
<p><b>${esc(company || '[Company name]')}</b></p>
<p class="note">Template from The Little Green Book. ${esc(t.note)} Replace everything in [square brackets], delete anything that does not apply, and have it checked by a competent person. Then save it as a PDF and upload it to your compliance pack.</p>
${body}
</body></html>`;
}
