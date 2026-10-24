import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { packOwner, BUCKET } from '@/lib/compliance';
import { docType, PACK_MAX_FILE_BYTES, PACK_MAX_TOTAL_BYTES, PACK_MIME } from '@/lib/complianceTypes';

// Step 1 of 2: hand back a one-time signed upload link. The file goes straight
// from the browser to storage, so large PDFs never pass through our server.

export const runtime = 'nodejs';

const Body = z.object({
  businessId: z.string(),
  docType: z.string(),
  name: z.string().min(1).max(200),
  type: z.string(),
  size: z.number().int().positive().max(PACK_MAX_FILE_BYTES, 'Each file must be under 20MB'),
});

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const ext = (name: string) => (name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin';

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail('Request blocked.', 403);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { businessId, name, type, size } = parsed.data;

  const own = await packOwner(businessId);
  if (!own.ok) return fail(own.error, own.status as 401);
  if (!docType(parsed.data.docType)) return fail('Unknown document type.');
  if (!PACK_MIME.includes(type)) return fail('Documents must be PDF, JPG or PNG.');

  const { data: rows } = await db().from('compliance_docs').select('size_bytes').eq('business_id', businessId).is('archived_at', null);
  const used = (rows ?? []).reduce((n, r) => n + (r.size_bytes as number), 0);
  if (used + size > PACK_MAX_TOTAL_BYTES) return fail('Your pack is full (200MB). Delete an old document first.');

  const path = `${businessId}/${parsed.data.docType}-${crypto.randomUUID()}.${ext(name)}`;
  const signed = await db().storage.from(BUCKET).createSignedUploadUrl(path);
  if (signed.error) return fail('Could not prepare your upload. Try again.', 500);
  return NextResponse.json({ ok: true, path, signedUrl: signed.data.signedUrl });
}
