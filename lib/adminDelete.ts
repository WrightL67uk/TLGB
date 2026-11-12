import 'server-only';
import { db } from './supabase';
import { stripe, stripeEnabled } from './stripe';

type Result = { ok: true; name: string } | { ok: false; error: string };

async function removeFiles(bucket: string, paths: (string | null | undefined)[]) {
  const list = paths.filter((p): p is string => !!p);
  for (let i = 0; i < list.length; i += 100) {
    const { error } = await db().storage.from(bucket).remove(list.slice(i, i + 100));
    if (error) console.error(`delete: removing files from ${bucket} failed`, error);
  }
}

/** Ends logins for an email unless it still belongs to another account. */
async function endLoginsIfUnused(email: string | null | undefined) {
  if (!email) return;
  const [{ count: b }, { count: s }, { count: c }] = await Promise.all([
    db().from('businesses').select('id', { count: 'exact', head: true }).eq('email', email),
    db().from('job_seekers').select('id', { count: 'exact', head: true }).eq('email', email),
    db().from('contractor_users').select('id', { count: 'exact', head: true }).eq('email', email),
  ]);
  if ((b ?? 0) + (s ?? 0) + (c ?? 0) > 0) return;
  await db().from('sessions').delete().eq('email', email);
  await db().from('login_tokens').delete().eq('email', email);
}

/** A member listing and everything hanging off it: documents, photos, compliance pack, team, payments, estimate requests. */
export async function deleteBusiness(id: string): Promise<Result> {
  const { data: b } = await db().from('businesses').select('id, trading_name, email, stripe_subscription_id, subscription_status').eq('id', id).maybeSingle();
  if (!b) return { ok: false, error: 'Listing not found.' };
  if (b.stripe_subscription_id && stripeEnabled() && !['canceled', 'incomplete_expired'].includes(b.subscription_status)) {
    try { await stripe('DELETE', `subscriptions/${b.stripe_subscription_id}`); }
    catch (err) {
      console.error('delete: cancelling subscription failed', err);
      return { ok: false, error: 'Could not cancel their Stripe subscription, so nothing was deleted. Cancel it in Stripe first, then try again.' };
    }
  }
  const [{ data: docs }, { data: photos }, { data: pack }] = await Promise.all([
    db().from('business_documents').select('storage_path').eq('business_id', id),
    db().from('business_photos').select('storage_path').eq('business_id', id),
    db().from('compliance_docs').select('storage_path').eq('business_id', id),
  ]);
  await removeFiles('documents', (docs ?? []).map((d) => d.storage_path));
  await removeFiles('portfolio', (photos ?? []).map((d) => d.storage_path));
  await removeFiles('compliance', (pack ?? []).map((d) => d.storage_path));
  const { error } = await db().from('businesses').delete().eq('id', id);
  if (error) { console.error('delete business failed', error); return { ok: false, error: 'Something went wrong deleting the listing.' }; }
  await endLoginsIfUnused(b.email);
  return { ok: true, name: b.trading_name };
}

export async function deleteSupplier(id: string): Promise<Result> {
  const { data: s } = await db().from('suppliers').select('name, logo_path, stripe_subscription_id, subscription_status').eq('id', id).maybeSingle();
  if (!s) return { ok: false, error: 'Supplier not found.' };
  const { data: pics } = await db().from('supplier_photos').select('storage_path').eq('supplier_id', id);
  await removeFiles('portfolio', [...(pics ?? []).map((p) => p.storage_path), ...(s.logo_path ? [s.logo_path] : [])]);
  const { error } = await db().from('suppliers').delete().eq('id', id);
  if (error) { console.error('delete supplier failed', error); return { ok: false, error: 'Something went wrong deleting the supplier.' }; }
  return { ok: true, name: s.name };
}

export async function deleteSeeker(id: string): Promise<Result> {
  const { data: s } = await db().from('job_seekers').select('first_name, last_name, email').eq('id', id).maybeSingle();
  if (!s) return { ok: false, error: 'Profile not found.' };
  const { error } = await db().from('job_seekers').delete().eq('id', id);
  if (error) { console.error('delete seeker failed', error); return { ok: false, error: 'Something went wrong deleting the profile.' }; }
  await endLoginsIfUnused(s.email);
  return { ok: true, name: `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() || s.email };
}

/** A main contractor company with all its users, lists, jobs and drawings. */
export async function deleteContractor(id: string): Promise<Result> {
  const { data: c } = await db().from('contractor_companies').select('id, name').eq('id', id).maybeSingle();
  if (!c) return { ok: false, error: 'Contractor not found.' };
  const [{ data: users }, { data: jobs }] = await Promise.all([
    db().from('contractor_users').select('email').eq('company_id', id),
    db().from('contractor_jobs').select('id').eq('company_id', id),
  ]);
  if (jobs?.length) {
    const { data: files } = await db().from('contractor_job_files').select('storage_path').in('job_id', jobs.map((j) => j.id));
    await removeFiles('contractor-jobs', (files ?? []).map((f) => f.storage_path));
  }
  const { error } = await db().from('contractor_companies').delete().eq('id', id);
  if (error) { console.error('delete contractor failed', error); return { ok: false, error: 'Something went wrong deleting the contractor.' }; }
  for (const u of users ?? []) await endLoginsIfUnused(u.email);
  return { ok: true, name: c.name };
}
