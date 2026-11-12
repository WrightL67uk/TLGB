import 'server-only';
import { db } from './supabase';
import { getSessionEmail } from './session';

/**
 * Who is looking at the public search pages.
 * anon: not logged in. home: a free homeowner account (sees domestic trades and suppliers only).
 * trade: anyone with a business, supplier, contractor or job seeker login (sees everything, as before).
 */
export type Audience = 'anon' | 'home' | 'trade';

export async function searchAudience(): Promise<Audience> {
  const email = await getSessionEmail();
  if (!email) return 'anon';
  const head = { count: 'exact' as const, head: true };
  const [{ count: b }, { count: c }, { count: j }, { count: sp }] = await Promise.all([
    db().from('businesses').select('id', head).eq('email', email).neq('status', 'draft'),
    db().from('contractor_users').select('id', head).eq('email', email).is('removed_at', null),
    db().from('job_seekers').select('id', head).eq('email', email).neq('status', 'removed'),
    db().from('suppliers').select('id', head).eq('email', email).neq('status', 'rejected'),
  ]);
  if ((b ?? 0) + (c ?? 0) + (j ?? 0) + (sp ?? 0) > 0) return 'trade';
  return 'home';
}
