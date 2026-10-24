import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { packOwner, currentDocs, archiveDocs, BUCKET } from '@/lib/compliance';
import { docType, PACK_MAX_FILE_BYTES, PACK_MIME } from '@/lib/complianceTypes';
import { emailAdminComplianceUpload } from '@/lib/email';

// Step 2 of 2: the file is in storage. Record it.
// Insurance and accreditations wait for an admin check; the old version stays
// live until then. Everything else goes live straight away and replaces the old one.

export const runtime = 'nodejs';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const Body = z.object({
  businessId: z.string(),
  docType: z.string(),
  title: z.string().trim().min(2, 'Give the document a name').max(120),
  path: z.string().min(10).max(300),
  name: z.string().min(1).max(200),
  type: z.string(),
  size: z.number().int().positive().max(PACK_MAX_FILE_BYTES),
  expiry: z.string().regex(DATE).nullable(),
  reviewedOn: z.string().regex(DATE).nullable(),
  replaces: z.string().uuid().nullable(),
});

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail('Request blocked.', 403);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const p = parsed.data;

  const own = await packOwner(p.businessId);
  if (!own.ok) return fail(own.error, own.status as 401);
  const b = own.business;
  const t = docType(p.docType);
  if (!t) return fail('Unknown document type.');
  if (!PACK_MIME.includes(p.type)) return fail('Documents must be PDF, JPG or PNG.');
  if (!p.path.startsWith(`${b.id}/${t.key}-`) || p.path.includes('..')) return fail('Invalid upload.');
  if (t.expires && !p.expiry) return fail('Enter the expiry date from the certificate.');
  if (!t.expires && !p.reviewedOn) return fail('Enter the date you last reviewed this document.');
  const today = new Date().toISOString().slice(0, 10);
  if (p.reviewedOn && p.reviewedOn > today) return fail('The review date cannot be in the future.');

  // The file must really be there
  const fileName = p.path.split('/').pop()!;
  const { data: objs } = await db().storage.from(BUCKET).list(b.id, { search: fileName, limit: 5 });
  if (!(objs ?? []).some((o) => o.name === fileName)) return fail(`${p.name} did not finish uploading. Try again.`);

  const docs = await currentDocs(b.id);
  let replaces: string | null = null;
  if (p.replaces) {
    const old = docs.find((d) => d.id === p.replaces && d.doc_type === t.key);
    if (!old) return fail('The document you are replacing was not found. Refresh the page.');
    replaces = old.id;
  } else if (!t.multiple) {
    replaces = docs.find((d) => d.doc_type === t.key && d.status !== 'pending' && d.status !== 'rejected')?.id ?? null;
  }

  const status = t.checked ? 'pending' : 'provided';
  const ins = await db().from('compliance_docs').insert({
    business_id: b.id,
    doc_type: t.key,
    title: p.title,
    storage_path: p.path,
    file_name: p.name,
    mime_type: p.type,
    size_bytes: p.size,
    expiry: t.expires ? p.expiry : null,
    reviewed_on: t.expires ? null : p.reviewedOn,
    status,
    replaces,
  });
  if (ins.error) return fail('Could not save your document. Try again.', 500);

  // Own documents replace the old version now. Anything still waiting for a check in
  // the same slot (an earlier upload, or a rejected one) is cleared away.
  const sameSlot = (d: (typeof docs)[number]) =>
    d.doc_type === t.key && (!t.multiple || (replaces !== null && d.replaces === replaces));
  const stale = docs.filter((d) =>
    (status === 'provided' && d.id === replaces) ||
    (sameSlot(d) && (d.status === 'pending' || d.status === 'rejected')),
  );
  await archiveDocs(stale.map((d) => d.id));

  if (status === 'pending') await emailAdminComplianceUpload({ id: b.id, tradingName: b.trading_name }, p.title);
  return NextResponse.json({ ok: true, status });
}
