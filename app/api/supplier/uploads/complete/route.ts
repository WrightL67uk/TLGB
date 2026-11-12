import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { ownedSupplier } from '@/lib/supplierAccount';
import { PHOTO_MIME } from '@/lib/config';

// Step 2 of 2: the files are in storage. Check each one is there and belongs to this supplier, then record it.
export const runtime = 'nodejs';

const Body = z.object({
  supplierId: z.string(),
  kind: z.enum(['photo', 'logo']),
  files: z.array(z.object({ name: z.string().max(200), type: z.string(), path: z.string().min(10).max(300) })).min(1).max(10),
});
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail('Request blocked.', 403);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { supplierId, kind, files } = parsed.data;
  const own = await ownedSupplier(supplierId);
  if (!own.ok) return fail(own.error, own.status);
  const s = own.supplier;

  const { data: objs } = await db().storage.from('portfolio').list(`suppliers/${s.id}`, { limit: 1000 });
  const there = new Set((objs ?? []).map((o) => `suppliers/${s.id}/${o.name}`));
  const { data: existing } = await db().from('supplier_photos').select('storage_path, sort_order').eq('supplier_id', s.id);
  const recorded = new Set((existing ?? []).map((r) => r.storage_path));
  let order = Math.max(-1, ...(existing ?? []).map((p) => p.sort_order)) + 1;

  for (const f of files) {
    if (!f.path.startsWith(`suppliers/${s.id}/`) || f.path.includes('..')) return fail('Invalid upload.');
    if (!PHOTO_MIME.includes(f.type)) return fail('Invalid file type.');
    if (!there.has(f.path)) return fail(`${f.name} did not finish uploading. Try again.`);
    if (kind === 'logo') {
      if (s.logo_path && s.logo_path !== f.path) await db().storage.from('portfolio').remove([s.logo_path]);
      await db().from('suppliers').update({ logo_path: f.path }).eq('id', s.id);
    } else if (!recorded.has(f.path)) {
      await db().from('supplier_photos').insert({ supplier_id: s.id, storage_path: f.path, sort_order: order++ });
    }
  }
  return NextResponse.json({ ok: true });
}
