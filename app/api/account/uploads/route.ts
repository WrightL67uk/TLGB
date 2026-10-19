import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { ownedBusiness, DOC_FIELD_TYPE } from '@/lib/account';
import { DOC_MIME, PHOTO_MIME, MAX_FILE_BYTES, MAX_PHOTOS } from '@/lib/config';

// Step 1 of 2 for adding files from "My listing": hand back signed upload links.
// Rows are only written in step 2, once the files have actually arrived.

export const runtime = 'nodejs';

const Body = z.object({
  businessId: z.string(),
  files: z.array(z.object({
    field: z.enum(['letterhead', 'pl_certificate', 'el_certificate', 'accreditation_docs', 'photos']),
    name: z.string().min(1).max(200),
    type: z.string(),
    size: z.number().int().positive().max(MAX_FILE_BYTES, 'Each file must be under 10MB'),
  })).min(1).max(10),
});

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const ext = (name: string) => (name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin';

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail('Request blocked.', 403);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { businessId, files } = parsed.data;

  const own = await ownedBusiness(businessId);
  if (!own.ok) return fail(own.error, own.status);
  const b = own.business;
  if (b.status === 'suspended') return fail('This listing is suspended. Contact us to sort it out.', 403);

  for (const f of files) {
    if (f.field === 'letterhead' && b.business_type !== 'sole_trader') return fail('Letterheads are only needed for sole traders.');
    const allowed = f.field === 'photos' ? PHOTO_MIME : DOC_MIME;
    if (!allowed.includes(f.type)) {
      return fail(`${f.name}: ${f.field === 'photos' ? 'photos must be JPG, PNG or WebP' : 'documents must be PDF, JPG or PNG'}.`);
    }
  }

  const newPhotos = files.filter((f) => f.field === 'photos').length;
  if (newPhotos) {
    const { count } = await db().from('business_photos').select('id', { count: 'exact', head: true }).eq('business_id', b.id);
    if ((count ?? 0) + newPhotos > MAX_PHOTOS) {
      return fail(`You can have up to ${MAX_PHOTOS} photos. Delete some first.`);
    }
  }

  const uploads: { index: number; bucket: string; path: string; token: string }[] = [];
  for (const [index, f] of files.entries()) {
    const isPhoto = f.field === 'photos';
    const bucket = isPhoto ? 'portfolio' : 'documents';
    const path = isPhoto
      ? `${b.id}/${crypto.randomUUID()}.${ext(f.name)}`
      : `${b.id}/${DOC_FIELD_TYPE[f.field]}-${crypto.randomUUID()}.${ext(f.name)}`;
    const signed = await db().storage.from(bucket).createSignedUploadUrl(path);
    if (signed.error) return fail('Could not prepare your upload. Try again.', 500);
    uploads.push({ index, bucket, path, token: signed.data.token });
  }

  return NextResponse.json({ ok: true, uploads });
}
