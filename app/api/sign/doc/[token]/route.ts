import { NextRequest, NextResponse } from 'next/server';
import { loadByToken, download, logEvent, clientIp } from '@/lib/signing';
import { db } from '@/lib/supabase';

export const runtime = 'nodejs';

/** The document, for a signer who holds the link. ?v=final gives the signed copy once everyone has signed. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await loadByToken(token);
  if (!t) return new NextResponse('Not found', { status: 404 });
  const wantFinal = req.nextUrl.searchParams.get('v') === 'final';
  const path = wantFinal ? t.e.final_path : t.e.original_path;
  if (!path) return new NextResponse('Not ready', { status: 404 });
  const bytes = await download(path);
  if (!bytes) return new NextResponse('Not found', { status: 404 });
  if (!wantFinal && t.me.status === 'waiting' && t.e.status === 'sent') {
    await db().from('signing_signers').update({ status: 'viewed', viewed_at: new Date().toISOString() }).eq('id', t.me.id).eq('status', 'waiting');
    await logEvent(t.e.id, 'opened', null, t.me.id, clientIp(req));
  }
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${(wantFinal ? 'signed-' : '') + t.e.title.replace(/[^\w .-]/g, '').slice(0, 80)}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
