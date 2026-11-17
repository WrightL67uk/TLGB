import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { getAgency, creditBalance, addCredits } from '@/lib/agencies';
import { lookupPostcode } from '@/lib/postcodes';
import { LEVELS, SKILLS, WORK_TYPES, PAY_PERIODS } from '@/lib/seekerTypes';
import { QUAL_TYPES } from '@/lib/teamTypes';
import { emailAdminAgencyVacancy } from '@/lib/email';

export const runtime = 'nodejs';

const blank = (v: unknown) => (v === '' || v == null ? undefined : v);
const keys = (list: { key: string }[]) => z.array(z.enum(list.map((o) => o.key) as [string, ...string[]]));
const oneOf = (list: { key: string }[]) => z.preprocess(blank, z.enum(list.map((o) => o.key) as [string, ...string[]]).optional());
const money = z.preprocess((v) => blank(typeof v === 'string' ? v.replace(/[£,\s]/g, '') : v), z.coerce.number().min(0).max(1_000_000).optional());

const Schema = z.object({
  title: z.string().trim().min(3, 'Add a job title').max(100),
  client_name: z.preprocess(blank, z.string().trim().max(120).optional()),
  level: oneOf(LEVELS),
  start_date: z.preprocess(blank, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid start date').optional()),
  description: z.string().trim().min(30, 'Say a bit more about the job (at least a couple of sentences)').max(4000),
  postcode: z.string().trim().min(2, 'Add the postcode the job is based from').max(10),
  pay_min: money, pay_max: money, pay_period: oneOf(PAY_PERIODS),
  work_types: keys(WORK_TYPES), skills: keys(SKILLS), cards: keys(QUAL_TYPES),
  own_vehicle: z.boolean(),
  apply_email: z.preprocess(blank, z.string().trim().toLowerCase().email('Check the apply email address').max(200).optional()),
  apply_phone: z.preprocess(blank, z.string().trim().regex(/^[0-9+()\s-]{7,20}$/, 'Check the apply phone number').optional()),
  apply_url: z.preprocess(blank, z.string().trim().url('The apply link must start with https://').max(300).refine((u) => /^https?:\/\//i.test(u), 'The apply link must start with https://').optional()),
});

/**
 * An agency posts, edits, closes and re-runs vacancies. Each run costs one credit and goes to admin for
 * approval before it shows. Admin turning one down gives the credit back.
 */
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const go = (q: string, anchor = '') => NextResponse.redirect(new URL(`/recruiter/vacancies?${q}${anchor}`, req.url), 303);
  if (!fd || !sameOrigin(req)) return go('error=' + encodeURIComponent('Please use the form on our website.'));
  const agency = await getAgency();
  if (!agency) return NextResponse.redirect(new URL('/login?next=/recruiter/vacancies', req.url), 303);
  if (agency.status !== 'approved') return go('error=' + encodeURIComponent('Your agency has not been approved yet.'));

  const action = String(fd.get('action') ?? '');
  const vid = String(fd.get('vacancy_id') ?? '');
  const mine = vid
    ? (await db().from('vacancies').select('id, status').eq('id', vid).eq('agency_id', agency.id).neq('status', 'removed').maybeSingle()).data
    : null;
  if (vid && !mine) return go('error=Vacancy+not+found');
  const now = new Date().toISOString();

  if (action === 'close' && mine) {
    await db().from('vacancies').update({ status: 'closed', updated_at: now }).eq('id', mine.id);
    return go('closed=1');
  }
  if (action === 'reopen' && mine) {
    if (mine.status !== 'closed') return go('error=' + encodeURIComponent('Only a closed vacancy can be run again.'));
    if ((await creditBalance(agency.id)) < 1) return go('error=' + encodeURIComponent('You need a credit to run this vacancy again.'));
    // The ref makes each rerun its own charge
    const ref = `${mine.id}:${Date.now()}`;
    if (!(await addCredits(agency.id, -1, 'vacancy', ref))) return go('error=Something+went+wrong');
    await db().from('vacancies').update({ status: 'pending', rejection_reason: null, updated_at: now }).eq('id', mine.id);
    await emailAdminAgencyVacancy(agency.name, 'A vacancy run again').catch(() => null);
    return go('reopened=1');
  }
  if (action !== 'save') return go('error=Unknown+action');

  const all = (k: string) => fd.getAll(k).map(String);
  const p = Schema.safeParse({
    title: fd.get('title'), client_name: fd.get('client_name'), level: fd.get('level'), start_date: fd.get('start_date'), description: fd.get('description'),
    postcode: fd.get('postcode'), pay_min: fd.get('pay_min'), pay_max: fd.get('pay_max'), pay_period: fd.get('pay_period'),
    work_types: all('work_types'), skills: all('skills'), cards: all('cards'), own_vehicle: fd.get('own_vehicle') === 'yes',
    apply_email: fd.get('apply_email'), apply_phone: fd.get('apply_phone'), apply_url: fd.get('apply_url'),
  });
  const back = (msg: string) => go(`${mine ? `edit=${mine.id}` : 'new=1'}&error=${encodeURIComponent(msg)}`, '#form');
  if (!p.success) return back(p.error.issues[0].message);
  const d = p.data;
  if (!d.apply_email && !d.apply_phone && !d.apply_url) return back('Give at least one way to apply: email, phone or a link.');
  if (d.pay_min != null && d.pay_max != null && d.pay_max < d.pay_min) return back('The top of the pay range is lower than the bottom.');
  if ((d.pay_min != null || d.pay_max != null) && !d.pay_period) return back('Say whether the pay is per hour, day, week, month or year.');
  const pc = await lookupPostcode(d.postcode);
  if (!pc.ok) return back(pc.reason);

  const row = {
    title: d.title, client_name: d.client_name ?? null, level: d.level ?? null, start_date: d.start_date ?? null, description: d.description,
    postcode: pc.postcode, area: pc.postcode.split(' ')[0], lat: pc.lat, lng: pc.lng,
    pay_min: d.pay_min ?? null, pay_max: d.pay_max ?? null, pay_period: d.pay_period ?? null,
    work_types: d.work_types, skills: d.skills, cards: d.cards, own_vehicle: d.own_vehicle,
    apply_email: d.apply_email ?? null, apply_phone: d.apply_phone ?? null, apply_url: d.apply_url ?? null,
    updated_at: now,
  };

  if (mine) {
    // A turned-down vacancy had its credit returned, so sending it again costs one. Any other edit is free.
    if (mine.status === 'rejected') {
      if ((await creditBalance(agency.id)) < 1) return back('You need a credit to send this vacancy again.');
      if (!(await addCredits(agency.id, -1, 'vacancy', `${mine.id}:${Date.now()}`))) return back('Something went wrong. Please try again.');
    }
    if (mine.status === 'closed') return back('Run the vacancy again first, then edit it.');
    const { error } = await db().from('vacancies').update({ ...row, status: 'pending', rejection_reason: null, alerts_done_at: null }).eq('id', mine.id);
    if (error) { console.error('agency vacancy update failed', error); return back('Something went wrong. Please try again.'); }
    await emailAdminAgencyVacancy(agency.name, d.title).catch(() => null);
    return go('saved=1');
  }

  if ((await creditBalance(agency.id)) < 1) return go('error=' + encodeURIComponent('You have no credits left. Get more from your dashboard.'));
  const { data: created, error } = await db().from('vacancies').insert({
    ...row, agency_id: agency.id, status: 'pending',
    expires_at: new Date(Date.now() + 60 * 86_400_000).toISOString(), // reset when approved
  }).select('id').single();
  if (error || !created) { console.error('agency vacancy insert failed', error); return back('Something went wrong. Please try again.'); }
  if (!(await addCredits(agency.id, -1, 'vacancy', created.id))) {
    await db().from('vacancies').delete().eq('id', created.id);
    return back('Something went wrong. Please try again.');
  }
  await emailAdminAgencyVacancy(agency.name, d.title).catch(() => null);
  return go('posted=1');
}
