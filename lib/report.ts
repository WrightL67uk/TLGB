/** Reasons offered when someone reports a business. */
export const REPORT_REASONS = [
  { key: 'cover', label: "Insurance or accreditation isn't valid" },
  { key: 'work', label: 'Poor or unfinished work' },
  { key: 'identity', label: 'Pretending to be another company' },
  { key: 'unsafe', label: 'Unsafe working' },
  { key: 'other', label: 'Something else' },
] as const;

export const reasonLabel = (key: string) => REPORT_REASONS.find((r) => r.key === key)?.label ?? key;
