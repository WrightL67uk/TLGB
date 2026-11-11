import 'server-only';
import { db } from './supabase';

// Trade or supplier for each waiting list sign-up.
// Kept in site_settings (one row per email, key "waitlist_type:<email>") so it works without a database change.
// Migration 026 moves these into a waitlist.member_type column later.

export type MemberType = 'trade' | 'supplier';
export const TYPE_LABEL: Record<MemberType, string> = { trade: 'Trade', supplier: 'Supplier' };
const key = (email: string) => `waitlist_type:${email.toLowerCase()}`;

export async function saveWaitlistType(email: string, type: MemberType) {
  await db().from('site_settings').upsert({ key: key(email), value: { type }, updated_at: new Date().toISOString() });
}

/** email -> type, for the admin list and spreadsheet. */
export async function waitlistTypes(): Promise<Record<string, MemberType>> {
  const { data } = await db().from('site_settings').select('key, value').like('key', 'waitlist_type:%').limit(20000);
  const out: Record<string, MemberType> = {};
  for (const r of data ?? []) {
    const t = (r.value as { type?: string })?.type;
    if (t === 'trade' || t === 'supplier') out[r.key.slice('waitlist_type:'.length)] = t;
  }
  return out;
}
