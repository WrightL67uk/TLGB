/** Who is writing in, as chosen on the contact form. */
export const CONTACT_ROLES = [
  { key: 'job-seeker', label: 'Job seeker' },
  { key: 'trade', label: 'Trade or subcontractor' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'recruitment-agency', label: 'Recruitment agency' },
  { key: 'main-contractor', label: 'Main contractor or housebuilder' },
  { key: 'other', label: 'Something else' },
] as const;

export const roleLabel = (key: string) => CONTACT_ROLES.find((r) => r.key === key)?.label ?? key;

/** Contact form messages go to all three inboxes. Reply-To is the sender, so anyone can answer directly. */
export const CONTACT_RECIPIENTS = ['admin@tlgb.co.uk', 'ed@tlgb.co.uk', 'trudy@tlgb.co.uk'];
