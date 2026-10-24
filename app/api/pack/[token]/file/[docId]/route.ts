import { NextRequest, NextResponse } from 'next/server';
import { openPack, signedDownload, logPackEvent } from '@/lib/compliance';
import { getSessionEmail } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** One document from a shared pack. Logged so the member can see what was downloaded. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string; docId: string }> }) {
  const { token, docId } = await params;
  const pack = await openPack(token);
  if (!pack.ok) return NextResponse.redirect(new URL(`/pack/${encodeURIComponent(token)}`, req.url), 303);
  const doc = pack.docs.find((d) => d.id === docId);
  if (!doc) return new NextResponse('This document is no longer in the pack.', { status: 404 });
  const url = await signedDownload(doc.storage_path, doc.file_name, 60);
  if (!url) return new NextResponse('File not available', { status: 404 });
  if ((await getSessionEmail()) !== pack.business.email) await logPackEvent(pack.link, 'download', doc.title);
  return NextResponse.redirect(url, 302);
}
