import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { ownedBusiness } from '@/lib/account';

export const runtime = 'nodejs';

const Body = z.object({ businessId: z.string(), linkId: z.string().uuid() });

/** Switches a share link off. Works even if the membership has lapsed. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false, error: 'Request blocked.' }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
  const own = await ownedBusiness(parsed.data.businessId);
  if (!own.ok) return NextResponse.json({ ok: false, error: own.error }, { status: own.status });
  await db().from('pack_links').update({ revoked_at: new Date().toISOString() })
    .eq('id', parsed.data.linkId).eq('business_id', own.business.id).is('revoked_at', null);
  return NextResponse.json({ ok: true });
}
