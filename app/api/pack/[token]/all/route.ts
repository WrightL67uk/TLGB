import { NextRequest, NextResponse } from 'next/server';
import { openPack, signedDownload, logPackEvent } from '@/lib/compliance';
import { getSessionEmail } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const safe = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80);

/**
 * "Download all": hands the browser short-lived links to every document; the page
 * builds the zip itself, so large packs never pass through our server.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const pack = await openPack(token);
  if (!pack.ok) return NextResponse.json({ ok: false, error: 'This link is no longer available.' }, { status: 404 });

  const used = new Set<string>();
  const files: { name: string; url: string }[] = [];
  for (const d of pack.docs) {
    const url = await signedDownload(d.storage_path, d.file_name, 300);
    if (!url) continue;
    const ext = d.file_name.includes('.') ? d.file_name.split('.').pop()!.toLowerCase() : 'pdf';
    let name = `${safe(d.title)}.${ext}`;
    for (let n = 2; used.has(name.toLowerCase()); n++) name = `${safe(d.title)} (${n}).${ext}`;
    used.add(name.toLowerCase());
    files.push({ name, url });
  }
  if ((await getSessionEmail()) !== pack.business.email) await logPackEvent(pack.link, 'zip', `${files.length} documents`);
  return NextResponse.json({ ok: true, zipName: `${safe(pack.business.trading_name)} compliance pack.zip`, files });
}
