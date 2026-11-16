import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { ownedSupplier } from '@/lib/supplierAccount';
import { DOC_MIME, MAX_FILE_BYTES } from '@/lib/config';
import { DOC_KINDS, cleanSoil, isSoilSupplier, soilProblem } from '@/lib/soil';
import { emailAdminSupplier } from '@/lib/email';

export const runtime = 'nodejs';
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const ext = (name: string) => (name.split('.').pop() ?? 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'pdf';
const kinds = DOC_KINDS.map((k) => k.key) as [string, ...string[]];

const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('save'), supplierId: z.string(), submit: z.boolean().optional(), soil: z.unknown() }),
  z.object({ action: z.literal('sign'), supplierId: z.string(), file: z.object({ name: z.string().min(1).max(200), type: z.string(), size: z.number().int().positive().max(MAX_FILE_BYTES, 'Each file must be under 10MB') }) }),
  z.object({
    action: z.literal('register'), supplierId: z.string(), path: z.string().max(300), name: z.string().max(200), kind: z.enum(kinds),
    title: z.string().trim().max(120).optional(), tested_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  }),
  z.object({ action: z.literal('delete'), supplierId: z.string(), docId: z.string() }),
]);

/** Anything that changes what a buyer would see sends an approved listing back for another check. */
async function recheck(id: string, status: string) {
  if (status === 'approved') await db().from('suppliers').update({ soil_status: 'pending', soil_note: null }).eq('id', id);
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail('Request blocked.', 403);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const d = parsed.data;
  const own = await ownedSupplier(d.supplierId);
  if (!own.ok) return fail(own.error, own.status);
  const s = own.supplier;
  if (s.status === 'rejected') return fail('This application was not approved.', 403);
  if (!isSoilSupplier(s.categories)) return fail('Tick "Soil, mulch and aggregates" on your profile first.', 403);
  const soilStatus = (s as unknown as { soil_status: string }).soil_status ?? 'none';

  if (d.action === 'sign') {
    if (!DOC_MIME.includes(d.file.type)) return fail(`${d.file.name}: please upload a PDF, JPG or PNG.`);
    const path = `supplier-docs/${s.id}/${crypto.randomUUID()}.${ext(d.file.name)}`;
    const signed = await db().storage.from('documents').createSignedUploadUrl(path);
    if (signed.error) return fail('Could not prepare your upload. Try again.', 500);
    return NextResponse.json({ ok: true, path, signedUrl: signed.data.signedUrl });
  }

  if (d.action === 'register') {
    if (!d.path.startsWith(`supplier-docs/${s.id}/`)) return fail('That file does not belong to your listing.', 403);
    const { count } = await db().from('supplier_docs').select('id', { count: 'exact', head: true }).eq('supplier_id', s.id);
    if ((count ?? 0) >= 20) return fail('You can upload up to 20 files. Delete one first.');
    const { error } = await db().from('supplier_docs').insert({
      supplier_id: s.id, kind: d.kind, title: d.title || null, tested_on: d.tested_on || null, file_name: d.name, storage_path: d.path,
    });
    if (error) return fail('Could not save the file. Try again.', 500);
    await recheck(s.id, soilStatus);
    return NextResponse.json({ ok: true });
  }

  if (d.action === 'delete') {
    if (!/^[0-9a-f-]{36}$/i.test(d.docId)) return fail('Not found.', 404);
    const { data: doc } = await db().from('supplier_docs').select('id, storage_path').eq('id', d.docId).eq('supplier_id', s.id).maybeSingle();
    if (!doc) return fail('Not found.', 404);
    await db().storage.from('documents').remove([doc.storage_path]).then(() => null, () => null);
    await db().from('supplier_docs').delete().eq('id', doc.id);
    await recheck(s.id, soilStatus);
    return NextResponse.json({ ok: true });
  }

  // save, and optionally send for checking
  const soil = cleanSoil(d.soil);
  const { count } = await db().from('supplier_docs').select('id', { count: 'exact', head: true }).eq('supplier_id', s.id);
  if (d.submit) {
    const problem = soilProblem(soil, count ?? 0);
    if (problem) return fail(problem);
  }
  const update: Record<string, unknown> = { soil };
  if (d.submit) Object.assign(update, { soil_status: 'pending', soil_note: null });
  else if (soilStatus === 'approved') Object.assign(update, { soil_status: 'pending', soil_note: null });
  const { error } = await db().from('suppliers').update(update).eq('id', s.id);
  if (error) {
    console.error('soil save failed', error);
    return fail('Something went wrong saving. Please try again.', 500);
  }
  const sent = !!d.submit || soilStatus === 'approved';
  if (sent) await emailAdminSupplier(`Soil check waiting: ${s.name}`, `${s.name} has sent their soil details and test certificates to be checked.`, s.id).catch(() => null);
  return NextResponse.json({ ok: true, submitted: sent });
}
