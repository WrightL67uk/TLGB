import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { packOwner } from '@/lib/compliance';

export const runtime = 'nodejs';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const opt = (n: number) => z.string().trim().max(n).nullable().transform((v) => v || null);
const Body = z.object({
  businessId: z.string(),
  id: z.string().uuid().nullable(),
  title: z.string().trim().min(2, 'Give the project a name').max(150),
  client: opt(150),
  location: opt(150),
  value_gbp: z.number().nonnegative().max(1e10).nullable(),
  start_date: z.string().regex(DATE).nullable(),
  end_date: z.string().regex(DATE).nullable(),
  scope: opt(3000),
  outcome: opt(3000),
  ref_name: opt(120),
  ref_role: opt(120),
  ref_email: z.string().trim().max(200).nullable().transform((v) => v || null)
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Check the reference email address'),
  ref_phone: opt(40),
  share_reference: z.boolean(),
});
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

/** Adds or updates a project in the member's experience library. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail('Request blocked.', 403);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { businessId, id, ...p } = parsed.data;
  const own = await packOwner(businessId);
  if (!own.ok) return fail(own.error, own.status as 401);

  if (id) {
    const { data, error } = await db().from('pqq_projects').update({ ...p, updated_at: new Date().toISOString() })
      .eq('id', id).eq('business_id', own.business.id).select('id');
    if (error || !data?.length) return fail('Could not save the project. Refresh and try again.', 500);
    return NextResponse.json({ ok: true, id });
  }
  const { count } = await db().from('pqq_projects').select('id', { count: 'exact', head: true }).eq('business_id', own.business.id);
  if ((count ?? 0) >= 50) return fail('You can keep up to 50 projects. Delete an old one first.');
  const { data, error } = await db().from('pqq_projects').insert({ ...p, business_id: own.business.id }).select('id').single();
  if (error) return fail('Could not save the project. Try again.', 500);
  return NextResponse.json({ ok: true, id: data.id });
}
