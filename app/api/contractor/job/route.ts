import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { getContractor, ownJob } from '@/lib/contractors';
import { lookupPostcode } from '@/lib/postcodes';
import { TRADES, ACCREDITATIONS, PL_COVER_OPTIONS } from '@/lib/config';
import { VALUE_BANDS } from '@/lib/contractorPlans';
import { cleanUrl } from '@/lib/resources';

export const runtime = 'nodejs';

const slugs = TRADES.map((t) => t.slug) as [string, ...string[]];
const bands = VALUE_BANDS.map((v) => v.key) as [string, ...string[]];
const blank = (v: unknown) => (v === '' || v == null ? undefined : v);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const Schema = z.object({
  title: z.string().trim().min(5, 'Add a job title').max(140),
  description: z.string().trim().min(30, 'Add a bit more about the package').max(6000),
  trades: z.array(z.enum(slugs)).min(1, 'Pick at least one trade').max(15),
  postcode: z.string().trim().min(5, 'Enter the site postcode').max(10),
  town: z.preprocess(blank, z.string().trim().max(80).optional()),
  value_band: z.preprocess(blank, z.enum(bands).optional()),
  start_date: z.preprocess(blank, date.optional()),
  return_date: z.preprocess(blank, date.optional()),
  min_pl: z.preprocess(blank, z.coerce.number().refine((n) => PL_COVER_OPTIONS.includes(n)).optional()),
  accreditations: z.array(z.enum(ACCREDITATIONS)).max(20),
  docs_url: z.preprocess(blank, z.string().trim().max(500).optional()),
  contact_name: z.string().trim().min(2, 'Add a contact name').max(120),
  contact_email: z.string().trim().toLowerCase().email('Add a contact email'),
});

/** Creates a draft job, or saves changes to one. */
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const id = String(fd?.get('id') ?? '');
  const formPath = id && /^[0-9a-f-]{36}$/i.test(id) ? `/contractor/jobs/${id}/edit` : '/contractor/jobs/new';
  const err = (m: string) => NextResponse.redirect(new URL(`${formPath}?error=${encodeURIComponent(m)}`, req.url), 303);
  if (!sameOrigin(req) || !fd) return err('Please send the form from our website.');
  const me = await getContractor();
  if (!me) return NextResponse.redirect(new URL('/login?next=/contractor', req.url), 303);
  if (me.company.status === 'suspended') return err('This account cannot post jobs.');

  const g = (k: string) => (fd.get(k) == null ? undefined : String(fd.get(k)));
  const parsed = Schema.safeParse({
    title: g('title'), description: g('description'), trades: fd.getAll('trades').map(String), postcode: g('postcode'),
    town: g('town'), value_band: g('value_band'), start_date: g('start_date'), return_date: g('return_date'), min_pl: g('min_pl'),
    accreditations: fd.getAll('accreditations').map(String), docs_url: g('docs_url'), contact_name: g('contact_name'), contact_email: g('contact_email'),
  });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? 'Please check the form.');
  const d = parsed.data;
  if (d.return_date && d.return_date < new Date().toISOString().slice(0, 10)) return err('The reply-by date is in the past.');
  const docs = d.docs_url ? cleanUrl(d.docs_url) : null;
  if (d.docs_url && !docs) return err('That documents link does not look right.');

  const pc = await lookupPostcode(d.postcode);
  if (!pc.ok) return err(pc.reason);
  let region: string | null = null;
  try {
    const r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc.postcode)}`, { signal: AbortSignal.timeout(8000) });
    const j = await r.json();
    region = j?.result?.region ?? j?.result?.country ?? null;
  } catch { /* region is only a label */ }

  const row = {
    title: d.title, description: d.description, trades: d.trades, postcode: pc.postcode, lat: pc.lat, lng: pc.lng,
    town: d.town ?? null, region, value_band: d.value_band ?? null, start_date: d.start_date ?? null, return_date: d.return_date ?? null,
    min_pl: d.min_pl ?? null, accreditations: d.accreditations, docs_url: docs, contact_name: d.contact_name, contact_email: d.contact_email,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const job = await ownJob(me, id);
    if (!job) return err('That job could not be found.');
    const { error } = await db().from('contractor_jobs').update(row).eq('id', job.id);
    if (error) return err('Could not save. Try again.');
    return NextResponse.redirect(new URL(`/contractor/jobs/${job.id}?saved=1`, req.url), 303);
  }
  const { count } = await db().from('contractor_jobs').select('id', { count: 'exact', head: true }).eq('company_id', me.company.id).eq('status', 'draft');
  if ((count ?? 0) >= 20) return err('You have 20 draft jobs. Send or delete some first.');
  const { data, error } = await db().from('contractor_jobs').insert({ ...row, company_id: me.company.id, posted_by: me.user.email }).select('id').single();
  if (error || !data) {
    console.error('job insert failed', error);
    return err('Could not save. Try again.');
  }
  return NextResponse.redirect(new URL(`/contractor/jobs/${data.id}`, req.url), 303);
}
