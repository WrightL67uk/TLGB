import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { ownedSupplier, MAX_SUPPLIER_VIDEOS, VIDEO_MIME, MAX_VIDEO_BYTES } from '@/lib/supplierAccount';

export const runtime = 'nodejs';
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const ext = (name: string) => (name.split('.').pop() ?? 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'mp4';

const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('sign'), supplierId: z.string(), file: z.object({ name: z.string().min(1).max(200), type: z.string(), size: z.number().int().positive() }) }),
  z.object({ action: z.literal('register'), supplierId: z.string(), path: z.string().min(10).max(300), name: z.string().max(200) }),
  z.object({ action: z.literal('caption'), supplierId: z.string(), captions: z.record(z.string(), z.string().trim().max(120)) }),
  z.object({ action: z.literal('delete'), supplierId: z.string(), videoId: z.string().uuid() }),
]);

// Videos are for the paid plans, like pictures. Step 1 hands back a signed upload link, step 2 records the file.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail('Request blocked.', 403);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const d = parsed.data;
  const own = await ownedSupplier(d.supplierId);
  if (!own.ok) return fail(own.error, own.status);
  const s = own.supplier;
  if (!s.tier) return fail('Videos are part of the Appear and Match plans. Upgrade from your supplier account to add them.', 403);
  const count = async () => (await db().from('supplier_videos').select('id', { count: 'exact', head: true }).eq('supplier_id', s.id)).count ?? 0;

  if (d.action === 'sign') {
    if (!VIDEO_MIME.includes(d.file.type)) return fail(`${d.file.name}: videos must be MP4, MOV or WebM.`);
    if (d.file.size > MAX_VIDEO_BYTES) return fail(`${d.file.name} is over ${Math.round(MAX_VIDEO_BYTES / 1_048_576)}MB. Shorten or compress it and try again.`);
    if ((await count()) >= MAX_SUPPLIER_VIDEOS) return fail(`You can have up to ${MAX_SUPPLIER_VIDEOS} videos. Delete one first.`);
    const path = `suppliers/${s.id}/video-${crypto.randomUUID()}.${ext(d.file.name)}`;
    const signed = await db().storage.from('portfolio').createSignedUploadUrl(path);
    if (signed.error) return fail('Could not prepare your upload. Try again.', 500);
    return NextResponse.json({ ok: true, path, signedUrl: signed.data.signedUrl });
  }
  if (d.action === 'register') {
    if (!d.path.startsWith(`suppliers/${s.id}/video-`) || d.path.includes('..')) return fail('Invalid upload.');
    const { data: objs } = await db().storage.from('portfolio').list(`suppliers/${s.id}`, { limit: 1000 });
    if (!(objs ?? []).some((o) => `suppliers/${s.id}/${o.name}` === d.path)) return fail(`${d.name} did not finish uploading. Try again.`);
    const { data: existing } = await db().from('supplier_videos').select('sort_order, storage_path').eq('supplier_id', s.id);
    if ((existing ?? []).some((v) => v.storage_path === d.path)) return NextResponse.json({ ok: true });
    if ((existing ?? []).length >= MAX_SUPPLIER_VIDEOS) return fail(`You can have up to ${MAX_SUPPLIER_VIDEOS} videos.`);
    const order = Math.max(-1, ...(existing ?? []).map((v) => v.sort_order)) + 1;
    const { error } = await db().from('supplier_videos').insert({ supplier_id: s.id, storage_path: d.path, sort_order: order });
    if (error) return fail('Could not save the video. Try again.', 500);
    return NextResponse.json({ ok: true });
  }
  if (d.action === 'caption') {
    for (const [id, caption] of Object.entries(d.captions)) {
      if (/^[0-9a-f-]{36}$/i.test(id)) await db().from('supplier_videos').update({ caption: caption || null }).eq('id', id).eq('supplier_id', s.id);
    }
    return NextResponse.json({ ok: true });
  }
  const { data: v } = await db().from('supplier_videos').select('id, storage_path').eq('id', d.videoId).eq('supplier_id', s.id).maybeSingle();
  if (!v) return fail('Video not found.', 404);
  await db().storage.from('portfolio').remove([v.storage_path]);
  await db().from('supplier_videos').delete().eq('id', v.id);
  return NextResponse.json({ ok: true });
}
