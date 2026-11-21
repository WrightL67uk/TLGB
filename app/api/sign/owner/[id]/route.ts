import { NextRequest, NextResponse } from 'next/server';
import { getSessionEmail } from '@/lib/session';
import { loadEnvelope, download } from '@/lib/signing';

export const runtime = 'nodejs';

/** The sender's own copy: the original, or the signed PDF once complete (?v=final). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const email = await getSessionEmail();
  const env = await loadEnvelope((await params).id);
  if (!email || !env || env.e.owner_email !== email) return new NextResponse('Not found', { status: 404 });
  const final = req.nextUrl.searchParams.get('v') === 'final';
  const path = final ? env.e.final_path : env.e.original_path;
  if (!path) return new NextResponse('Not ready', { status: 404 });
  const bytes = await download(path);
  if (!bytes) return new NextResponse('Not found', { status: 404 });
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${(final ? 'signed-' : '') + env.e.title.replace(/[^\w .-]/g, '').slice(0, 80)}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
