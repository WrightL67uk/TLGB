import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { ownedBusiness } from '@/lib/account';
import { isPaid } from '@/lib/membership';
import { lookupPostcode } from '@/lib/postcodes';
import { LEVELS, SKILLS, WORK_TYPES, PAY_PERIODS } from '@/lib/seekerTypes';
import { QUAL_TYPES } from '@/lib/teamTypes';
import { vacanciesUsed, VACANCY_LIVE_DAYS, DEFAULT_VACANCY_LIMIT } from '@/lib/vacancies';
import { alertSeekersAboutVacancy } from '@/lib/recruitJob';
import { emailAdminVacancy } from '@/lib/email';

export const runtime = 'nodejs';

const blank = (v: unknown) => (v === '' || v == null ? undefined : v);
const keys = (list: { key: string }[]) => z.array(z.enum(list.map((o) => o.key) as [string, ...string[]]));
const oneOf = (list: { key: string }[]) => z.preprocess(blank, z.enum(list.map((o) => o.key) as [string, ...string[]]).optional());
const money = z.preprocess((v) => blank(typeof v === 'string' ? v.replace(/[£,\s]/g, '') : v), z.coerce.number().min(0).max(1_000_000).optional());

const Schema = z.object({
  title: z.string().trim().min(3, 'Add a job title').max(100),
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

/** Members post, edit, close and reopen vacancies. Paid members only, up to their post limit. */
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const id = String(fd?.get('business_id') ?? '');
  const go = (q: string, anchor = '') => NextResponse.redirect(new URL(`/account/${id}/vacancies?${q}${anchor}`, req.url), 303);
  if (!fd || !sameOrigin(req)) return go('error=' + encodeURIComponent('Please use the form on our website.'));
  const own = await ownedBusiness(id);
  if (!own.ok) return NextResponse.redirect(new URL(own.status === 401 ? `/login?next=/account/${id}/vacancies` : '/account', req.url), 303);
  const b = own.business;
  if (!isPaid(b)) return go('error=' + encodeURIComponent('Posting vacancies is part of verified membership.'));
  const action = String(fd.get('action') ?? '');
  const vid = String(fd.get('vacancy_id') ?? '');
  const mine = vid
    ? (await db().from('vacancies').select('id, status').eq('id', vid).eq('business_id', b.id).neq('status', 'removed').maybeSingle()).data
    : null;
  if (vid && !mine) return go('error=Vacancy+not+found');
  const now = new Date();
  const expiry = new Date(now.getTime() + VACANCY_LIVE_DAYS * 86_400_000).toISOString();

  if (action === 'close' && mine) {
    await db().from('vacancies').update({ status: 'closed', updated_at: now.toISOString() }).eq('id', mine.id);
    return go('closed=1');
  }
  if (action === 'reopen' && mine) {
    await db().from('vacancies').update({ status: 'live', expires_at: expiry, updated_at: now.toISOString() }).eq('id', mine.id);
    return go('reopened=1');
  }
  if (action !== 'save') return go('error=Unknown+action');

  const all = (k: string) => fd.getAll(k).map(String);
  const p = Schema.safeParse({
    title: fd.get('title'), level: fd.get('level'), start_date: fd.get('start_date'), description: fd.get('description'),
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
    title: d.title, level: d.level ?? null, start_date: d.start_date ?? null, description: d.description,
    postcode: pc.postcode, area: pc.postcode.split(' ')[0], lat: pc.lat, lng: pc.lng,
    pay_min: d.pay_min ?? null, pay_max: d.pay_max ?? null, pay_period: d.pay_period ?? null,
    work_types: d.work_types, skills: d.skills, cards: d.cards, own_vehicle: d.own_vehicle,
    apply_email: d.apply_email ?? null, apply_phone: d.apply_phone ?? null, apply_url: d.apply_url ?? null,
    updated_at: now.toISOString(),
  };

  if (mine) {
    const { error } = await db().from('vacancies').update(row).eq('id', mine.id);
    if (error) { console.error('vacancy update failed', error); return back('Something went wrong. Please try again.'); }
    return go('saved=1');
  }

  if ((await vacanciesUsed(b.id)) >= (b.vacancy_limit ?? DEFAULT_VACANCY_LIMIT)) {
    return go('error=' + encodeURIComponent('You have used all your vacancy posts. Contact us at admin@tlgb.co.uk to add more.'));
  }
  const { data: created, error } = await db().from('vacancies').insert({ ...row, business_id: b.id, status: 'live', expires_at: expiry }).select('*').single();
  if (error || !created) { console.error('vacancy insert failed', error); return back('Something went wrong. Please try again.'); }
  await emailAdminVacancy(b.trading_name, created.title, created.id).catch(() => null);
  await alertSeekersAboutVacancy(created.id).catch((e) => console.error('vacancy alerts failed', e));
  return go('posted=1');
}
