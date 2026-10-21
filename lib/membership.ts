import 'server-only';
import { db } from './supabase';
import { getSessionEmail } from './session';

export const PAID_STATUSES = ['active', 'trialing', 'past_due'];

export type MemberRow = { id: string; status: string; founding_member: boolean; subscription_status: string };

/** A listing counts as a paying member if it is approved and either free (founding) or subscribed. */
export const isPaid = (b: Pick<MemberRow, 'status' | 'founding_member' | 'subscription_status'>) =>
  b.status === 'approved' && (b.founding_member || PAID_STATUSES.includes(b.subscription_status));

export type Membership = {
  email: string | null;
  loggedIn: boolean;
  approved: boolean;   // has at least one approved listing
  paid: boolean;       // has at least one approved, paid listing
  unpaidId: string | null; // an approved listing that still needs paying for
};

/** Who is looking at the page, and what they have paid for. */
export async function getMembership(): Promise<Membership> {
  const email = await getSessionEmail();
  if (!email) return { email: null, loggedIn: false, approved: false, paid: false, unpaidId: null };
  const { data } = await db()
    .from('businesses')
    .select('id, status, founding_member, subscription_status')
    .eq('email', email)
    .neq('status', 'draft');
  const rows = (data ?? []) as MemberRow[];
  const approved = rows.filter((r) => r.status === 'approved');
  return {
    email,
    loggedIn: true,
    approved: approved.length > 0,
    paid: approved.some(isPaid),
    unpaidId: approved.find((r) => !isPaid(r))?.id ?? null,
  };
}

export type Pending = {
  pl?: { expiry: string; cover: number };
  el?: { expiry: string | null; cover: number | null };
  acc?: Record<string, string | null>;
};

type VerifyFields = Pick<MemberRow, 'status' | 'founding_member' | 'subscription_status'> & {
  pl_expiry: string | null; el_expiry: string | null; el_cover_amount: number | null;
};

/** Why a listing is not verified, or null if it is. Uses confirmed dates only. */
export function unverifiedReason(b: VerifyFields): 'membership' | 'insurance' | null {
  if (!(b.founding_member || PAID_STATUSES.includes(b.subscription_status))) return 'membership';
  const today = new Date().toISOString().slice(0, 10);
  if (!b.pl_expiry || b.pl_expiry < today) return 'insurance';
  if (b.el_cover_amount != null && (!b.el_expiry || b.el_expiry < today)) return 'insurance';
  return null;
}

export const UNVERIFIED_TEXT: Record<'membership' | 'insurance', string> = {
  membership: 'Membership lapsed, so their documents are no longer being checked.',
  insurance: 'Insurance has expired and a current certificate has not been checked yet.',
};
