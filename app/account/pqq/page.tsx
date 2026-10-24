import { redirect } from 'next/navigation';
import { db } from '@/lib/supabase';
import { getSessionEmail } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** Short address for the answer bank: goes straight to it when there is one listing. */
export default async function PqqShortcut() {
  const email = await getSessionEmail();
  if (!email) redirect('/login?next=/account/pqq');
  const { data } = await db().from('businesses').select('id').eq('email', email).neq('status', 'draft');
  if (data?.length === 1) redirect(`/account/${data[0].id}/pqq`);
  redirect('/account');
}
