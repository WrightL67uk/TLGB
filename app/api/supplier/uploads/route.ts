import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { ownedSupplier, MAX_SUPPLIER_PHOTOS } from '@/lib/supplierAccount';
import { PHOTO_MIME, MAX_FILE_BYTES } from '@/lib/config';

// Step 1 of 2 for supplier pictures: hand back signed upload links. Rows are written in step 2.
export const runtime = 'nodejs';

const Body = z.object({
  supplierId: z.string(),
  kind: z.enum(['photo', 'logo']),
  files: z.array(z.object({
    name: z.string().min(1).max(200),
    type: z.string(),
    size: z.number().int().positive().max(MAX_FILE_BYTES, 'Each picture must be under 10MB'),
  })).min(1).max(10),
});

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const ext = (name: string) => (name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'jpg';

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail('Request blocked.', 403);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { supplierId, kind, files } = parsed.data;
  const own = await ownedSupplier(supplierId);
  if (!own.ok) return fail(own.error, own.status);
  const s = own.supplier;
  for (const f of files) if (!PHOTO_MIME.includes(f.type)) return fail(`${f.name}: pictures must be JPG, PNG or WebP.`);
  if (kind === 'logo' && files.length > 1) return fail('One logo only.');
  if (kind === 'photo') {
    const { count } = await db().from('supplier_photos').select('id', { count: 'exact', head: true }).eq('supplier_id', s.id);
    if ((count ?? 0) + files.length > MAX_SUPPLIER_PHOTOS) return fail(`You can have up to ${MAX_SUPPLIER_PHOTOS} pictures. Delete some first.`);
  }
  const uploads: { index: number; path: string; signedUrl: string }[] = [];
  for (const [index, f] of files.entries()) {
    const path = `suppliers/${s.id}/${kind === 'logo' ? 'logo-' : ''}${crypto.randomUUID()}.${ext(f.name)}`;
    const signed = await db().storage.from('portfolio').createSignedUploadUrl(path);
    if (signed.error) return fail('Could not prepare your upload. Try again.', 500);
    uploads.push({ index, path, signedUrl: signed.data.signedUrl });
  }
  return NextResponse.json({ ok: true, uploads });
}
