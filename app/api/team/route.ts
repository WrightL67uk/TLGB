import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { packOwner } from '@/lib/compliance';
import { TEAM_MAX_PEOPLE, TEAM_MAX_QUALS } from '@/lib/team';
import { qualType, impliedExpiry } from '@/lib/teamTypes';

export const runtime = 'nodejs';

// Team and training actions. Every form posts here with business_id and an action,
// and is sent back to the team page.

const blank = (v: unknown) => (v === '' || v == null ? undefined : v);
const date = z.preprocess(blank, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date').optional());
const text = (max: number) => z.preprocess(blank, z.string().trim().max(max).optional());

const PersonSchema = z.object({
  name: z.string().trim().min(2, 'Enter their name').max(80),
  role: text(80),
});

const QualSchema = z.object({
  qual_type: z.string().refine((k) => !!qualType(k), 'Pick the card or course'),
  detail: text(120),
  number: text(40),
  achieved_on: date,
  expiry: date,
});

const isId = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const bid = String(fd?.get('business_id') ?? '');
  const page = `/account/${bid}/team`;
  const go = (error?: string, anchor = '') => {
    const u = new URL(page, req.url);
    if (error) u.searchParams.set('error', error);
    else u.searchParams.set('saved', '1');
    return NextResponse.redirect(`${u.toString()}${anchor}`, 303);
  };
  if (!fd || !isId(bid)) return NextResponse.redirect(new URL('/account', req.url), 303);
  if (!sameOrigin(req)) return go('Please use the forms on our website.');
  const own = await packOwner(bid);
  if (!own.ok) return NextResponse.redirect(new URL(own.status === 401 ? `/login?next=${page}` : `/account/${bid}`, req.url), 303);

  const action = String(fd.get('action') ?? '');
  const get = (k: string) => fd.get(k) ?? undefined;
  const pid = String(fd.get('person_id') ?? '');
  const qid = String(fd.get('qual_id') ?? '');
  const now = new Date().toISOString();

  const ownPerson = async () => {
    if (!isId(pid)) return false;
    const { count } = await db().from('team_people').select('id', { count: 'exact', head: true }).eq('id', pid).eq('business_id', bid);
    return !!count;
  };

  try {
    if (action === 'person-add' || action === 'person-edit') {
      const p = PersonSchema.safeParse({ name: get('name'), role: get('role') });
      if (!p.success) return go(p.error.issues[0].message);
      const row = { name: p.data.name, role: p.data.role ?? null, updated_at: now };
      if (action === 'person-add') {
        const { count } = await db().from('team_people').select('id', { count: 'exact', head: true }).eq('business_id', bid);
        if ((count ?? 0) >= TEAM_MAX_PEOPLE) return go(`You can add up to ${TEAM_MAX_PEOPLE} people.`);
        const { data, error } = await db().from('team_people').insert({ ...row, business_id: bid }).select('id').single();
        if (error) throw error;
        return go(undefined, `#p-${data.id}`);
      }
      if (!(await ownPerson())) return go('That person could not be found.');
      await db().from('team_people').update(row).eq('id', pid).eq('business_id', bid);
      return go(undefined, `#p-${pid}`);
    }

    if (action === 'person-remove') {
      if (fd.get('confirm') !== 'yes') return go('Tick the box to confirm you want to remove them and their records.', `#p-${pid}`);
      if (!(await ownPerson())) return go();
      await db().from('team_people').delete().eq('id', pid).eq('business_id', bid);
      return go();
    }

    if (action === 'qual-add' || action === 'qual-edit') {
      const q = QualSchema.safeParse({ qual_type: get('qual_type'), detail: get('detail'), number: get('number'), achieved_on: get('achieved_on'), expiry: get('expiry') });
      if (!q.success) return go(q.error.issues[0].message, `#p-${pid}`);
      const d = q.data;
      if (d.qual_type === 'other' && !d.detail) return go('Enter the name of the card or course.', `#p-${pid}`);
      if (d.achieved_on && d.expiry && d.expiry < d.achieved_on) return go('The expiry date is before the date it was passed.', `#p-${pid}`);
      const row = {
        qual_type: d.qual_type, detail: d.detail ?? null, number: d.number ?? null,
        achieved_on: d.achieved_on ?? null,
        expiry: d.expiry ?? impliedExpiry(d.qual_type, d.achieved_on ?? null),
        updated_at: now,
      };
      if (!(await ownPerson())) return go('That person could not be found.');
      if (action === 'qual-add') {
        const { count } = await db().from('team_quals').select('id', { count: 'exact', head: true }).eq('person_id', pid);
        if ((count ?? 0) >= TEAM_MAX_QUALS) return go(`You can add up to ${TEAM_MAX_QUALS} cards for one person.`, `#p-${pid}`);
        await db().from('team_quals').insert({ ...row, person_id: pid, business_id: bid });
      } else {
        if (!isId(qid)) return go('That record could not be found.', `#p-${pid}`);
        await db().from('team_quals').update(row).eq('id', qid).eq('person_id', pid).eq('business_id', bid);
      }
      return go(undefined, `#p-${pid}`);
    }

    if (action === 'qual-remove') {
      if (isId(qid)) await db().from('team_quals').delete().eq('id', qid).eq('business_id', bid);
      return go(undefined, isId(pid) ? `#p-${pid}` : '');
    }

    return go('Unknown action.');
  } catch (err) {
    console.error('team action failed', action, err);
    return go('Something went wrong. Please try again.');
  }
}
