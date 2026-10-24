import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { packOwner } from '@/lib/compliance';
import { pqqQuestion, SHORT_LIMIT, LONG_LIMIT } from '@/lib/pqq';

export const runtime = 'nodejs';

const Body = z.object({
  businessId: z.string(),
  key: z.string().max(40),
  short: z.string().max(SHORT_LIMIT, 'That answer is too long').nullable(),
  long: z.string().max(LONG_LIMIT, 'That answer is too long').nullable(),
  data: z.object({
    yes: z.boolean().nullable().optional(),
    years: z.array(z.string().max(20)).max(3).optional(),
    values: z.record(z.string(), z.array(z.string().max(30)).max(3)).optional(),
  }).nullable(),
});
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

/** Saves one answer in the PQQ answer bank. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail('Request blocked.', 403);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { businessId, key, short, long, data } = parsed.data;
  const q = pqqQuestion(key);
  if (!q || q.type === 'auto') return fail('Unknown question.');
  const own = await packOwner(businessId);
  if (!own.ok) return fail(own.error, own.status as 401);

  const clean = (s: string | null) => (s && s.trim() ? s.trim() : null);
  const row = {
    business_id: own.business.id,
    key,
    short_text: clean(short),
    long_text: q.type === 'text' ? clean(long) : null,
    data: q.type === 'yesno' || q.type === 'figures' ? data : null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await db().from('pqq_answers').upsert(row, { onConflict: 'business_id,key' });
  if (error) return fail('Could not save. Try again.', 500);
  return NextResponse.json({ ok: true, updated_at: row.updated_at });
}
