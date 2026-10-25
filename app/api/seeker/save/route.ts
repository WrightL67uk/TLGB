import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { getSeeker, seekerName } from '@/lib/seekers';
import { lookupPostcode } from '@/lib/postcodes';
import { LEVELS, SKILLS, LICENCES, VEHICLE, TOOLS, WORK_TYPES, PAY_PERIODS, SEEKER_LIVE_DAYS } from '@/lib/seekerTypes';
import { QUAL_TYPES } from '@/lib/teamTypes';
import { emailAdminNewSeeker } from '@/lib/email';

export const runtime = 'nodejs';

const blank = (v: unknown) => (v === '' || v == null ? undefined : v);
const text = (max: number) => z.preprocess(blank, z.string().trim().max(max).optional());
const keys = (list: { key: string }[]) => z.array(z.enum(list.map((o) => o.key) as [string, ...string[]]));
const oneOf = (list: { key: string }[]) => z.preprocess(blank, z.enum(list.map((o) => o.key) as [string, ...string[]]).optional());
const date = z.preprocess(blank, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date').optional());
const money = z.preprocess((v) => blank(typeof v === 'string' ? v.replace(/[£,\s]/g, '') : v), z.coerce.number().min(0).max(1_000_000).optional());
const int = (min: number, max: number) => z.preprocess(blank, z.coerce.number().int().min(min).max(max).optional());

const Schema = z.object({
  first_name: z.string().trim().min(1, 'Enter your first name').max(60),
  last_name: z.string().trim().min(1, 'Enter your surname').max(60),
  show_full_name: z.boolean(),
  headline: z.string().trim().min(10, 'Add a one-line summary, for example "Landscape operative, 20 years\' experience"').max(120),
  about: text(3000),
  postcode: z.string().trim().min(2, 'Enter your postcode so employers can see roughly where you are').max(10),
  travel_miles: int(0, 500),
  stay_away: z.boolean(),
  years_experience: int(0, 70),
  level: oneOf(LEVELS),
  skills: keys(SKILLS),
  other_skills: text(1000),
  cards: keys(QUAL_TYPES),
  other_cards: text(500),
  licences: keys(LICENCES),
  vehicle: oneOf(VEHICLE),
  tools: oneOf(TOOLS),
  work_types: keys(WORK_TYPES),
  team_size: int(1, 50),
  available_from: date,
  available_until: date,
  pay_min: money,
  pay_max: money,
  pay_period: oneOf(PAY_PERIODS),
  past_employers: text(1500),
  phone: z.preprocess(blank, z.string().trim().regex(/^[0-9+()\s-]{7,20}$/, 'Enter a valid phone number').optional()),
  show_phone: z.boolean(),
  show_email: z.boolean(),
});

export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const go = (q: string) => NextResponse.redirect(new URL(`/seeker?${q}`, req.url), 303);
  if (!fd) return go('error=' + encodeURIComponent('Something went wrong. Please try again.'));
  if (!sameOrigin(req)) return go('error=' + encodeURIComponent('Please use the form on our website.'));
  const me = await getSeeker();
  if (!me) return NextResponse.redirect(new URL('/login?next=/seeker', req.url), 303);
  if (me.status === 'removed') return go('error=' + encodeURIComponent('This profile has been removed.'));

  const all = (k: string) => fd.getAll(k).map(String);
  const on = (k: string) => fd.get(k) === 'yes';
  const p = Schema.safeParse({
    first_name: fd.get('first_name'), last_name: fd.get('last_name'), show_full_name: on('show_full_name'),
    headline: fd.get('headline'), about: fd.get('about'), postcode: fd.get('postcode'),
    travel_miles: fd.get('travel_miles'), stay_away: on('stay_away'), years_experience: fd.get('years_experience'),
    level: fd.get('level'), skills: all('skills'), other_skills: fd.get('other_skills'),
    cards: all('cards'), other_cards: fd.get('other_cards'), licences: all('licences'),
    vehicle: fd.get('vehicle'), tools: fd.get('tools'), work_types: all('work_types'), team_size: fd.get('team_size'),
    available_from: fd.get('available_from'), available_until: fd.get('available_until'),
    pay_min: fd.get('pay_min'), pay_max: fd.get('pay_max'), pay_period: fd.get('pay_period'),
    past_employers: fd.get('past_employers'), phone: fd.get('phone'), show_phone: on('show_phone'), show_email: on('show_email'),
  });
  if (!p.success) return go('error=' + encodeURIComponent(p.error.issues[0].message));
  const d = p.data;
  if (d.available_from && d.available_until && d.available_until < d.available_from) return go('error=' + encodeURIComponent('Your "available until" date is before your "available from" date.'));
  if (d.pay_min != null && d.pay_max != null && d.pay_max < d.pay_min) return go('error=' + encodeURIComponent('The top of your pay range is lower than the bottom.'));
  if ((d.pay_min != null || d.pay_max != null) && !d.pay_period) return go('error=' + encodeURIComponent('Say whether your pay is per hour, day, week, month or year.'));
  if (d.show_phone && !d.phone) return go('error=' + encodeURIComponent('Add your phone number, or untick "Show my phone number".'));
  if (!d.show_phone && !d.show_email) return go('error=' + encodeURIComponent('Tick at least one way for employers to contact you.'));
  if (!d.skills.length && !d.other_skills) return go('error=' + encodeURIComponent('Tick at least one skill, or describe your skills in the box.'));

  let loc = { postcode: me.postcode, lat: me.lat, lng: me.lng, area: me.area };
  if (d.postcode.replace(/\s/g, '').toUpperCase() !== (me.postcode ?? '').replace(/\s/g, '')) {
    const pc = await lookupPostcode(d.postcode);
    if (!pc.ok) return go('error=' + encodeURIComponent(pc.reason));
    loc = { postcode: pc.postcode, lat: pc.lat, lng: pc.lng, area: pc.postcode.split(' ')[0] };
  }

  const publish = fd.get('publish') === 'yes';
  const goingLive = publish && me.status !== 'live';
  const now = new Date();
  const row = {
    ...d, ...loc,
    travel_miles: d.travel_miles ?? 20, team_size: d.team_size ?? 1,
    about: d.about ?? null, years_experience: d.years_experience ?? null, level: d.level ?? null, other_skills: d.other_skills ?? null,
    other_cards: d.other_cards ?? null, vehicle: d.vehicle ?? null, tools: d.tools ?? null,
    available_from: d.available_from ?? null, available_until: d.available_until ?? null,
    pay_min: d.pay_min ?? null, pay_max: d.pay_max ?? null, pay_period: d.pay_period ?? null,
    past_employers: d.past_employers ?? null, phone: d.phone ?? null,
    updated_at: now.toISOString(),
    ...(publish ? { status: 'live', published_at: me.published_at ?? now.toISOString(), expires_at: new Date(now.getTime() + SEEKER_LIVE_DAYS * 86_400_000).toISOString(), expiry_warned_at: null } : {}),
  };
  const { error } = await db().from('job_seekers').update(row).eq('id', me.id);
  if (error) {
    console.error('seeker save failed', error);
    return go('error=' + encodeURIComponent('Something went wrong saving your profile. Please try again.'));
  }
  if (goingLive) await emailAdminNewSeeker({ id: me.id, name: seekerName({ ...d }), headline: d.headline, area: loc.area });
  return go(goingLive ? 'published=1' : 'saved=1');
}
