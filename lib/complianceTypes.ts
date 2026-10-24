// Compliance pack catalogue. Shared by server and browser code, so no server-only imports.
// `key` is stored on each document, so never rename a key once used.

export type CategoryKey = 'insurance' | 'accreditation' | 'hs' | 'policy' | 'people' | 'company' | 'bank';

export const CATEGORIES: { key: CategoryKey; label: string; shareByDefault: boolean }[] = [
  { key: 'insurance', label: 'Insurance', shareByDefault: true },
  { key: 'accreditation', label: 'Accreditations', shareByDefault: true },
  { key: 'hs', label: 'Health and safety', shareByDefault: true },
  { key: 'policy', label: 'Company policies', shareByDefault: true },
  { key: 'people', label: 'People and training', shareByDefault: true },
  { key: 'company', label: 'Company details', shareByDefault: true },
  { key: 'bank', label: 'Bank letter', shareByDefault: false },
];
export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key) as [CategoryKey, ...CategoryKey[]];
export const categoryLabel = (k: string) => CATEGORIES.find((c) => c.key === k)?.label ?? k;

export type DocType = {
  key: string;
  label: string;
  category: CategoryKey;
  /** Insurance and accreditations: we check them before contractors see them. */
  checked: boolean;
  /** Can hold several documents (one per scheme, task or substance). */
  multiple: boolean;
  /** Needs an expiry date. Otherwise it gets a "last reviewed" date. */
  expires: boolean;
  /** Counts towards the "X of 14 added" progress bar. */
  core: boolean;
  /** Slug of a template members can download for this slot. */
  template?: string;
  hint?: string;
};

export const DOC_TYPES: DocType[] = [
  { key: 'pl', label: 'Public liability insurance', category: 'insurance', checked: true, multiple: false, expires: true, core: true },
  { key: 'el', label: 'Employers liability insurance', category: 'insurance', checked: true, multiple: false, expires: true, core: true, hint: 'Needed if you employ anyone, even part time.' },
  { key: 'pi', label: 'Professional indemnity insurance', category: 'insurance', checked: true, multiple: false, expires: true, core: false, hint: 'Only if you hold it, usually for design work.' },
  { key: 'accreditation', label: 'Accreditation certificate', category: 'accreditation', checked: true, multiple: true, expires: true, core: true, hint: 'One for each scheme: Constructionline, CHAS, SMAS and so on.' },
  { key: 'hs_policy', label: 'Health and safety policy', category: 'hs', checked: false, multiple: false, expires: false, core: true, template: 'health-and-safety-policy' },
  { key: 'rams', label: 'Risk assessment and method statement', category: 'hs', checked: false, multiple: true, expires: false, core: true, template: 'rams-soft-landscaping', hint: 'Add one for each type of work you do.' },
  { key: 'coshh', label: 'COSHH assessment', category: 'hs', checked: false, multiple: true, expires: false, core: true, template: 'coshh-assessment' },
  { key: 'env_policy', label: 'Environmental policy', category: 'policy', checked: false, multiple: false, expires: false, core: true, template: 'environmental-policy' },
  { key: 'quality_policy', label: 'Quality policy', category: 'policy', checked: false, multiple: false, expires: false, core: true, template: 'quality-policy' },
  { key: 'modern_slavery', label: 'Modern slavery statement', category: 'policy', checked: false, multiple: false, expires: false, core: true, template: 'modern-slavery-statement' },
  { key: 'equality', label: 'Equality, diversity and inclusion policy', category: 'policy', checked: false, multiple: false, expires: false, core: true, template: 'equality-policy' },
  { key: 'gdpr', label: 'Data protection (GDPR) policy', category: 'policy', checked: false, multiple: false, expires: false, core: true, template: 'data-protection-policy' },
  { key: 'carbon', label: 'Carbon reduction plan', category: 'policy', checked: false, multiple: false, expires: false, core: true, template: 'carbon-reduction-plan' },
  { key: 'training_matrix', label: 'Training matrix', category: 'people', checked: false, multiple: false, expires: false, core: true, template: 'training-matrix', hint: 'Who holds which CSCS card and plant ticket. Please do not upload copies of individual cards.' },
  { key: 'company_reg', label: 'Company registration or VAT certificate', category: 'company', checked: false, multiple: false, expires: false, core: true },
  { key: 'bank_letter', label: 'Bank letter', category: 'bank', checked: false, multiple: false, expires: false, core: false, hint: 'Only shared on links where you tick it.' },
];

export const docType = (key: string) => DOC_TYPES.find((d) => d.key === key);
export const CORE_COUNT = DOC_TYPES.filter((d) => d.core).length;

export const PACK_MAX_FILE_BYTES = 20 * 1024 * 1024;
export const PACK_MAX_TOTAL_BYTES = 200 * 1024 * 1024;
export const PACK_MIME = ['application/pdf', 'image/jpeg', 'image/png'];

/** Suggested names for accreditation certificates. */
export const ACCREDITATION_SUGGESTIONS = [
  'Constructionline Gold', 'Constructionline Silver', 'CHAS', 'SMAS Worksafe', 'SafeContractor',
  'Acclaim', 'Avetta', 'ISO 9001', 'ISO 14001', 'ISO 45001', 'BALI', 'APL', 'NHSS 18', 'Arboricultural Association ARB Approved',
];

export type DocStatus = 'checked' | 'provided' | 'pending' | 'rejected';

export type ShownStatus = { key: 'ok' | 'checked' | 'own' | 'expiring' | 'expired' | 'pending' | 'review' | 'rejected'; label: string };

const dayMs = 86_400_000;
export const daysTo = (d: string, now = new Date()) =>
  Math.ceil((new Date(`${d}T00:00:00Z`).getTime() - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) / dayMs);

/** How a document should be labelled. `forContractor` hides internal states. */
export function shownStatus(d: { status: DocStatus; expiry: string | null; reviewed_on: string | null }, forContractor = false): ShownStatus {
  if (d.status === 'pending') return { key: 'pending', label: 'Waiting for check' };
  if (d.status === 'rejected') return { key: 'rejected', label: 'Not accepted' };
  if (d.expiry) {
    const days = daysTo(d.expiry);
    if (days < 0) return { key: 'expired', label: 'Expired' };
    if (days <= 30) return { key: 'expiring', label: forContractor ? (d.status === 'checked' ? 'Checked by TLGB' : 'Provided by member') : 'Expiring soon' };
  }
  if (d.status === 'checked') return { key: 'checked', label: forContractor ? 'Checked by TLGB' : 'Checked' };
  if (!forContractor && d.reviewed_on && daysTo(d.reviewed_on) < -365) return { key: 'review', label: 'Review due' };
  return { key: 'own', label: forContractor ? 'Provided by member' : 'Provided' };
}

export const ukDate = (d: string | null | undefined) =>
  d ? new Date(d.length === 10 ? `${d}T00:00:00Z` : d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '';

export const fileSize = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`);
