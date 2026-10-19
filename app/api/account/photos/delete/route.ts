import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { ownedBusiness } from '@/lib/account';

export const runtime = 'nodejs';

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail('Request blocked.', 403);
  const parsed = z.object({ businessId: z.string(), photoId: z.string().uuid() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('Invalid request.');

  const own = await ownedBusiness(parsed.data.businessId);
  if (!own.ok) return fail(own.error, own.status);
  if (own.business.status === 'suspended') return fail('This listing is suspended. Contact us to sort it out.', 403);

  const { data: photo } = await db()
    .from('business_photos')
    .select('id, storage_path')
    .eq('id', parsed.data.photoId)
    .eq('business_id', own.business.id)
    .maybeSingle();
  if (!photo) return fail('Photo not found.', 404);

  await db().storage.from('portfolio').remove([photo.storage_path]);
  await db().from('business_photos').delete().eq('id', photo.id);
  return NextResponse.json({ ok: true });
}
