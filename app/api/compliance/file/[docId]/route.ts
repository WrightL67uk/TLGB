import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { ownedBusiness } from '@/lib/account';
import { signedDownload } from '@/lib/compliance';

export const runtime = 'nodejs';

/** Lets a member open one of their own pack documents. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(docId)) return new NextResponse('Not found', { status: 404 });
  const { data: doc } = await db().from('compliance_docs').select('business_id, storage_path, file_name, archived_at').eq('id', docId).maybeSingle();
  if (!doc || doc.archived_at) return new NextResponse('Not found', { status: 404 });
  const own = await ownedBusiness(doc.business_id);
  if (!own.ok) return NextResponse.redirect(new URL('/login', req.url), 303);
  const url = await signedDownload(doc.storage_path, doc.file_name, 60);
  if (!url) return new NextResponse('File not available', { status: 404 });
  return NextResponse.redirect(url, 302);
}
