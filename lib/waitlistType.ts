// Trade or supplier for each waiting list sign-up (waitlist.member_type).
export type MemberType = 'trade' | 'supplier';
export const TYPE_LABEL: Record<MemberType, string> = { trade: 'Trade', supplier: 'Supplier' };
