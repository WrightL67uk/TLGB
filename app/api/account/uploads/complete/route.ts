import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { ownedBusiness, flagForRecheck, DOC_FIELD_TYPE, DOC_TYPE_LABEL } from '@/lib/account';
import { DOC_MIME, PHOTO_MIME, MAX_FILE_BYTES } from '@/lib/config';

// Step 2 of 2: the files are in storage. Check each one exists and belongs to
// this listing, then record it. New documents on an approved listing are
// flagged for the admin to check.

export const runtime = 'nodejs';

const Body = z.object({
  businessId: z.string(),
  files: z.array(z.object({
    field: z.enum(['letterhead', 'pl_certificate', 'el_certificate', 'accreditation_docs', 'photos']),
    name: z.string().min(1).max(200),
    type: z.string(),
    size: z.number().int().positive().max(MAX_FILE_BYTES),
    path: z.string().min(10).max(300),
  })).min(1).max(10),
});

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail('Request blocked.', 403);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { businessId, files } = parsed.data;

  const own = await ownedBusiness(businessId);
  if (!own.ok) return fail(own.error, own.status);
  const b = own.business;
  if (b.status === 'suspended') return fail('This listing is suspended. Contact us to sort it out.', 403);

  const [{ data: docObjs }, { data: photoObjs }, { data: existingDocs }, { data: existingPhotos }] = await Promise.all([
    db().storage.from('documents').list(b.id, { limit: 1000 }),
    db().storage.from('portfolio').list(b.id, { limit: 1000 }),
    db().from('business_documents').select('storage_path').eq('business_id', b.id),
    db().from('business_photos').select('storage_path, sort_order').eq('business_id', b.id),
  ]);
  const inStorage = new Set([
    ...(docObjs ?? []).map((o) => `documents:${b.id}/${o.name}`),
    ...(photoObjs ?? []).map((o) => `portfolio:${b.id}/${o.name}`),
  ]);
  const recorded = new Set([...(existingDocs ?? []), ...(existingPhotos ?? [])].map((r) => r.storage_path));
  let nextOrder = Math.max(-1, ...(existingPhotos ?? []).map((p) => p.sort_order)) + 1;

  const reasons: string[] = [];
  for (const f of files) {
    const isPhoto = f.field === 'photos';
    const bucket = isPhoto ? 'portfolio' : 'documents';
    if (!f.path.startsWith(`${b.id}/`) || f.path.includes('..')) return fail('Invalid upload.');
    if (!(isPhoto ? PHOTO_MIME : DOC_MIME).includes(f.type)) return fail('Invalid file type.');
    if (recorded.has(f.path)) continue;
    if (!inStorage.has(`${bucket}:${f.path}`)) return fail(`${f.name} did not finish uploading. Try again.`);

    if (isPhoto) {
      const ins = await db().from('business_photos').insert({ business_id: b.id, storage_path: f.path, sort_order: nextOrder++ });
      if (ins.error) return fail('Could not save your photo. Try again.', 500);
    } else {
      const docType = DOC_FIELD_TYPE[f.field];
      const ins = await db().from('business_documents').insert({
        business_id: b.id, doc_type: docType, storage_path: f.path,
        file_name: f.name, mime_type: f.type, size_bytes: f.size,
      });
      if (ins.error) return fail('Could not save your document. Try again.', 500);
      reasons.push(`New ${DOC_TYPE_LABEL[docType].toLowerCase()} uploaded`);
    }
  }

  await flagForRecheck(b, [...new Set(reasons)], own.email);
  return NextResponse.json({ ok: true, recheck: b.status === 'approved' && reasons.length > 0 });
}
