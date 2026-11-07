import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { claudeAllowed } from '@/lib/claudeAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/claude/photos?business_id=... : temporary download links (1 hour) for a listing's photos. */
export async function GET(req: NextRequest) {
  if (!claudeAllowed(req)) return new NextResponse('Not found', { status: 404 });
  const id = req.nextUrl.searchParams.get('business_id') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'business_id needed' }, { status: 400 });
  const { data: photos } = await db().from('business_photos').select('storage_path, caption, sort_order').eq('business_id', id).order('sort_order');
  const out = [];
  for (const p of photos ?? []) {
    const { data } = await db().storage.from('portfolio').createSignedUrl(p.storage_path, 3600);
    out.push({ caption: p.caption, url: data?.signedUrl ?? null });
  }
  return NextResponse.json({ photos: out });
}
