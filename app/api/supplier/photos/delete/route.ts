import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { ownedSupplier } from '@/lib/supplierAccount';

export const runtime = 'nodejs';
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail('Request blocked.', 403);
  const parsed = z.object({ supplierId: z.string(), photoId: z.string().uuid().optional(), logo: z.boolean().optional() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('Invalid request.');
  const own = await ownedSupplier(parsed.data.supplierId);
  if (!own.ok) return fail(own.error, own.status);
  const s = own.supplier;
  if (parsed.data.logo) {
    if (s.logo_path) await db().storage.from('portfolio').remove([s.logo_path]);
    await db().from('suppliers').update({ logo_path: null }).eq('id', s.id);
    return NextResponse.json({ ok: true });
  }
  if (!parsed.data.photoId) return fail('Invalid request.');
  const { data: p } = await db().from('supplier_photos').select('id, storage_path').eq('id', parsed.data.photoId).eq('supplier_id', s.id).maybeSingle();
  if (!p) return fail('Picture not found.', 404);
  await db().storage.from('portfolio').remove([p.storage_path]);
  await db().from('supplier_photos').delete().eq('id', p.id);
  return NextResponse.json({ ok: true });
}
