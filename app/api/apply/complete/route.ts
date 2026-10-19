import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { db } from '@/lib/supabase';
import { emailAdminNewApplication, emailApplicantReceived } from '@/lib/email';

// Step 2 of 2: browser has uploaded the files. Check they all arrived, move the
// application into the admin queue and send the emails.

export const runtime = 'nodejs';

function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';
  const token = typeof body?.uploadToken === 'string' ? body.uploadToken : '';
  if (!id || !token) return fail('Missing application reference.');

  const { data: biz } = await db()
    .from('businesses')
    .select('id, status, upload_token, trading_name, business_type, contact_name, email, company_number, base_postcode')
    .eq('id', id)
    .maybeSingle();

  if (!biz || biz.status !== 'draft' || !biz.upload_token) return fail('Application not found or already submitted.', 404);

  const given = Buffer.from(createHash('sha256').update(token).digest('hex'));
  const stored = Buffer.from(biz.upload_token);
  if (given.length !== stored.length || !timingSafeEqual(given, stored)) return fail('Invalid upload token.', 403);

  // Every expected file must exist in storage
  const [{ data: docs }, { data: photos }, { data: docObjs }, { data: photoObjs }] = await Promise.all([
    db().from('business_documents').select('storage_path').eq('business_id', id),
    db().from('business_photos').select('storage_path').eq('business_id', id),
    db().storage.from('documents').list(id, { limit: 100 }),
    db().storage.from('portfolio').list(id, { limit: 100 }),
  ]);
  const present = new Set([
    ...(docObjs ?? []).map((o) => `documents:${id}/${o.name}`),
    ...(photoObjs ?? []).map((o) => `portfolio:${id}/${o.name}`),
  ]);
  const missing = [
    ...(docs ?? []).filter((d) => !present.has(`documents:${d.storage_path}`)),
    ...(photos ?? []).filter((p) => !present.has(`portfolio:${p.storage_path}`)),
  ];
  if (missing.length) return fail(`${missing.length} file(s) did not finish uploading. Please try again.`);

  const { error } = await db()
    .from('businesses')
    .update({ status: 'pending_review', upload_token: null })
    .eq('id', id)
    .eq('status', 'draft');
  if (error) return fail('Could not submit your application. Please try again.', 500);

  await db().from('review_events').insert({ business_id: id, action: 'submitted', actor: biz.email });

  const summary = {
    id,
    tradingName: biz.trading_name,
    businessType: biz.business_type,
    contactName: biz.contact_name,
    email: biz.email,
    companyNumber: biz.company_number,
    postcode: biz.base_postcode,
  };
  await Promise.all([emailAdminNewApplication(summary), emailApplicantReceived(summary)]);

  return NextResponse.json({ ok: true });
}
