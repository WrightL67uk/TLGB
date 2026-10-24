import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sameOrigin } from '@/lib/session';
import { packOwner, currentDocs, archiveDocs } from '@/lib/compliance';

export const runtime = 'nodejs';

const Body = z.object({ businessId: z.string(), docId: z.string().uuid() });
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

/** Removes a document from the pack and deletes the file. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail('Request blocked.', 403);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('Invalid request.');
  const own = await packOwner(parsed.data.businessId);
  if (!own.ok) return fail(own.error, own.status as 401);

  const docs = await currentDocs(own.business.id);
  const doc = docs.find((d) => d.id === parsed.data.docId);
  if (!doc) return fail('Document not found. Refresh the page.', 404);
  // Deleting a live certificate also clears any replacement still waiting for a check
  const ids = [doc.id, ...docs.filter((d) => d.replaces === doc.id).map((d) => d.id)];
  await archiveDocs(ids);
  return NextResponse.json({ ok: true });
}
