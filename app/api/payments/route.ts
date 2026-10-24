import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { packOwner } from '@/lib/compliance';

export const runtime = 'nodejs';

// Payment tracker actions. Every form posts here with business_id (and job_id where it applies),
// and is sent back to the tracker page.

const blank = (v: unknown) => (v === '' || v == null ? undefined : v);
const money = z.preprocess((v) => blank(typeof v === 'string' ? v.replace(/[£,\s]/g, '') : v), z.coerce.number().min(0).max(1e10).optional());
const date = z.preprocess(blank, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional());
const days = (max: number, dflt: number) => z.preprocess(blank, z.coerce.number().int().min(0).max(max).default(dflt));
const pct = z.preprocess(blank, z.coerce.number().min(0).max(100).default(0));

const JobSchema = z.object({
  name: z.string().trim().min(2, 'Give the job a name').max(120),
  contractor: z.string().trim().min(2, 'Add the main contractor').max(120),
  contractor_contact: z.preprocess(blank, z.string().trim().max(120).optional()),
  contractor_address: z.preprocess(blank, z.string().trim().max(300).optional()),
  contract_ref: z.preprocess(blank, z.string().trim().max(60).optional()),
  contract_sum: money,
  terms: z.enum(['scheme', 'custom']),
  due_days: days(120, 0), final_days: days(120, 30), notice_days: days(60, 5), payless_days: days(60, 7),
  exclude_holidays: z.boolean(),
  retention_pct: pct, first_release_pct: z.preprocess(blank, z.coerce.number().min(0).max(100).default(50)),
  dlp_months: days(60, 12), pc_date: date, retention_override: money,
  notes: z.preprocess(blank, z.string().trim().max(2000).optional()),
});

const AppSchema = z.object({
  number: z.preprocess(blank, z.coerce.number().int().min(1).max(999).optional()),
  applied_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter the date you applied'),
  period_end: date,
  gross_to_date: money,
  amount_applied: z.preprocess((v) => (typeof v === 'string' ? v.replace(/[£,\s]/g, '') : v), z.coerce.number({ message: 'Enter the amount applied for' }).min(0).max(1e10)),
  payment_notice_on: date, amount_notified: money,
  payless_on: date, amount_payless: money,
  paid_on: date, amount_paid: money,
  notes: z.preprocess(blank, z.string().trim().max(500).optional()),
});

const isId = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const bid = String(fd?.get('business_id') ?? '');
  const jid = String(fd?.get('job_id') ?? '');
  const listPath = `/account/${bid}/payments`;
  const jobPath = (id: string) => `${listPath}/${id}`;
  const go = (path: string, error?: string, saved = false) => {
    const u = new URL(path, req.url);
    if (error) u.searchParams.set('error', error);
    else if (saved) u.searchParams.set('saved', '1');
    return NextResponse.redirect(u, 303);
  };
  if (!fd || !isId(bid)) return NextResponse.redirect(new URL('/account', req.url), 303);
  if (!sameOrigin(req)) return go(listPath, 'Please use the forms on our website.');
  const own = await packOwner(bid);
  if (!own.ok) return NextResponse.redirect(new URL(own.status === 401 ? '/login' : `/account/${bid}`, req.url), 303);

  const g = (k: string) => (fd.get(k) == null ? undefined : String(fd.get(k)));
  const action = g('action');

  // The job, if one is named, must belong to this listing
  let job: { id: string } | null = null;
  if (jid) {
    if (!isId(jid)) return go(listPath, 'Job not found.');
    const { data } = await db().from('pay_jobs').select('id').eq('id', jid).eq('business_id', bid).maybeSingle();
    if (!data) return go(listPath, 'Job not found.');
    job = data;
  }
  const back = job ? jobPath(job.id) : listPath;

  if (action === 'job-save') {
    const p = JobSchema.safeParse({
      name: g('name'), contractor: g('contractor'), contractor_contact: g('contractor_contact'), contractor_address: g('contractor_address'),
      contract_ref: g('contract_ref'), contract_sum: g('contract_sum'), terms: g('terms') === 'scheme' ? 'scheme' : 'custom',
      due_days: g('due_days'), final_days: g('final_days'), notice_days: g('notice_days'), payless_days: g('payless_days'),
      exclude_holidays: fd.get('exclude_holidays') === 'on', retention_pct: g('retention_pct'), first_release_pct: g('first_release_pct'),
      dlp_months: g('dlp_months'), pc_date: g('pc_date'), retention_override: g('retention_override'), notes: g('notes'),
    });
    if (!p.success) return go(back, p.error.issues[0]?.message ?? 'Please check the form.');
    const d = p.data;
    const row = {
      ...d, contractor_contact: d.contractor_contact ?? null, contractor_address: d.contractor_address ?? null, contract_ref: d.contract_ref ?? null,
      contract_sum: d.contract_sum ?? null, pc_date: d.pc_date ?? null, retention_override: d.retention_override ?? null, notes: d.notes ?? null,
      // Under the Scheme the Act's day counting always applies
      exclude_holidays: d.terms === 'scheme' ? true : d.exclude_holidays,
      updated_at: new Date().toISOString(),
    };
    if (job) {
      const { error } = await db().from('pay_jobs').update(row).eq('id', job.id);
      return error ? go(back, 'Could not save. Try again.') : go(back, undefined, true);
    }
    const { count } = await db().from('pay_jobs').select('id', { count: 'exact', head: true }).eq('business_id', bid).is('archived_at', null);
    if ((count ?? 0) >= 200) return go(listPath, 'You have 200 current jobs. Mark some as finished first.');
    const { data, error } = await db().from('pay_jobs').insert({ ...row, business_id: bid }).select('id').single();
    if (error || !data) return go(listPath, 'Could not add the job. Try again.');
    return go(jobPath(data.id));
  }

  if (!job) return go(listPath, 'Job not found.');

  if (action === 'job-archive' || action === 'job-unarchive') {
    await db().from('pay_jobs').update({ archived_at: action === 'job-archive' ? new Date().toISOString() : null }).eq('id', job.id);
    return go(action === 'job-archive' ? listPath : back);
  }
  if (action === 'job-delete') {
    if (fd.get('confirm') !== '1') return go(back, 'Tick "I’m sure" to delete.');
    await db().from('pay_jobs').delete().eq('id', job.id);
    return go(listPath);
  }
  if (action === 'retention') {
    const p = z.object({ first_released_on: date, first_released_amount: money, second_released_on: date, second_released_amount: money })
      .safeParse({ first_released_on: g('first_released_on'), first_released_amount: g('first_released_amount'), second_released_on: g('second_released_on'), second_released_amount: g('second_released_amount') });
    if (!p.success) return go(back, 'Please check the dates and amounts.');
    const d = p.data;
    await db().from('pay_jobs').update({
      first_released_on: d.first_released_on ?? null, first_released_amount: d.first_released_amount ?? null,
      second_released_on: d.second_released_on ?? null, second_released_amount: d.second_released_amount ?? null, updated_at: new Date().toISOString(),
    }).eq('id', job.id);
    return go(back, undefined, true);
  }

  if (action === 'app-create' || action === 'app-update') {
    const p = AppSchema.safeParse({
      number: g('number'), applied_on: g('applied_on'), period_end: g('period_end'), gross_to_date: g('gross_to_date'), amount_applied: g('amount_applied'),
      payment_notice_on: g('payment_notice_on'), amount_notified: g('amount_notified'), payless_on: g('payless_on'), amount_payless: g('amount_payless'),
      paid_on: g('paid_on'), amount_paid: g('amount_paid'), notes: g('notes'),
    });
    if (!p.success) return go(back, p.error.issues[0]?.message ?? 'Please check the form.');
    const d = p.data;
    const row = {
      applied_on: d.applied_on, period_end: d.period_end ?? null, gross_to_date: d.gross_to_date ?? null, amount_applied: d.amount_applied,
      payment_notice_on: d.payment_notice_on ?? null, amount_notified: d.amount_notified ?? null,
      payless_on: d.payless_on ?? null, amount_payless: d.amount_payless ?? null,
      paid_on: d.paid_on ?? null, amount_paid: d.paid_on ? (d.amount_paid ?? null) : (d.amount_paid ?? null), notes: d.notes ?? null,
    };
    if (action === 'app-update') {
      const aid = g('app_id') ?? '';
      if (!isId(aid)) return go(back, 'Application not found.');
      const { error } = await db().from('pay_apps').update(row).eq('id', aid).eq('job_id', job.id);
      return error ? go(back, 'Could not save. Try again.') : go(back, undefined, true);
    }
    const { data: last } = await db().from('pay_apps').select('number').eq('job_id', job.id).order('number', { ascending: false }).limit(1).maybeSingle();
    const { error } = await db().from('pay_apps').insert({ ...row, job_id: job.id, business_id: bid, number: d.number ?? ((last?.number ?? 0) + 1) });
    return error ? go(back, 'Could not add the application. Try again.') : go(back, undefined, true);
  }
  if (action === 'app-delete') {
    if (fd.get('confirm') !== '1') return go(back, 'Tick "I’m sure" to delete.');
    const aid = g('app_id') ?? '';
    if (isId(aid)) await db().from('pay_apps').delete().eq('id', aid).eq('job_id', job.id);
    return go(back);
  }
  return go(back, 'Unknown action.');
}
