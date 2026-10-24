import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { ownedBusiness } from '@/lib/account';

export const runtime = 'nodejs';

const Body = z.object({ businessId: z.string(), id: z.string().uuid() });

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false, error: 'Request blocked.' }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
  const own = await ownedBusiness(parsed.data.businessId);
  if (!own.ok) return NextResponse.json({ ok: false, error: own.error }, { status: own.status });
  await db().from('pqq_projects').delete().eq('id', parsed.data.id).eq('business_id', own.business.id);
  return NextResponse.json({ ok: true });
}
