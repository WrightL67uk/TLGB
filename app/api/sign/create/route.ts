import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PDFDocument } from 'pdf-lib';
import { db } from '@/lib/supabase';
import { getSessionEmail, sameOrigin } from '@/lib/session';
import { tooMany } from '@/lib/rateLimit';
import { emailSigningRequest } from '@/lib/email';
import { SIGN_BUCKET, MAX_PDF_BYTES, MAX_SIGNERS, EXPIRY_DAYS, sha256, newToken, tokenHash, signLink, logEvent, clientIp } from '@/lib/signing';

export const runtime = 'nodejs';
export const maxDuration = 30;

const Signer = z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().toLowerCase().email().max(200) });
const Body = z.object({
  title: z.string().trim().min(2).max(160),
  message: z.string().trim().max(1500).optional(),
  signers: z.array(Signer).min(1).max(MAX_SIGNERS),
});

const fail = (msg: string, status = 400) => NextResponse.json({ ok: false, error: msg }, { status });

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail('Please send the form from our website.');
  const owner = await getSessionEmail();
  if (!owner) return fail('Please log in first.', 401);
  const fd = await req.formData().catch(() => null);
  if (!fd) return fail('Something went wrong. Please try again.');

  const file = fd.get('file');
  if (!(file instanceof File) || !file.size) return fail('Choose the PDF you want signed.');
  if (file.size > MAX_PDF_BYTES) return fail('That file is too big. The limit is 15 MB.');
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') return fail('Only PDF files can be signed. In Word, choose Save as PDF first.');
  try {
    const doc = await PDFDocument.load(bytes);
    if (doc.getPageCount() < 1) return fail('That PDF has no pages.');
  } catch {
    return fail('We could not read that PDF. If it is password protected, remove the password and try again.');
  }

  let parsedSigners: unknown;
  try { parsedSigners = JSON.parse(String(fd.get('signers') ?? '[]')); } catch { return fail('Please check the signers.'); }
  const parsed = Body.safeParse({ title: fd.get('title'), message: String(fd.get('message') ?? '') || undefined, signers: parsedSigners });
  if (!parsed.success) {
    const paths = parsed.error.issues.map((i) => i.path[0]);
    return fail(paths.includes('title') ? 'Give the document a title.' : paths.includes('signers') ? 'Add each signer\'s name and a valid email address (up to 6).' : 'Please check the form.');
  }
  const b = parsed.data;
  if (new Set(b.signers.map((s) => s.email)).size !== b.signers.length) return fail('Each signer needs their own email address.');
  if (await tooMany('sign-create', owner, 15, 60 * 24)) return fail('You have sent a lot of documents today. Please try again tomorrow, or email admin@tlgb.co.uk.');

  const { data: env, error } = await db().from('signing_envelopes').insert({
    owner_email: owner, title: b.title, message: b.message ?? null, original_path: 'pending', original_name: file.name.slice(0, 200) || 'document.pdf',
    original_sha256: sha256(bytes), expires_at: new Date(Date.now() + EXPIRY_DAYS * 86_400_000).toISOString(),
  }).select('id').single();
  if (error || !env) { console.error('signing insert failed', error); return fail('Could not save the document. Please try again.', 500); }

  const path = `${env.id}/original.pdf`;
  const up = await db().storage.from(SIGN_BUCKET).upload(path, bytes, { contentType: 'application/pdf' });
  if (up.error) { console.error('signing upload failed', up.error); await db().from('signing_envelopes').delete().eq('id', env.id); return fail('Could not store the file. Please try again.', 500); }
  await db().from('signing_envelopes').update({ original_path: path }).eq('id', env.id);

  const tokens = b.signers.map(() => newToken());
  const { error: se } = await db().from('signing_signers').insert(b.signers.map((s, i) => ({ envelope_id: env.id, position: i + 1, name: s.name, email: s.email, token_hash: tokenHash(tokens[i]) })));
  if (se) { console.error('signers insert failed', se); await db().from('signing_envelopes').delete().eq('id', env.id); return fail('Could not save the signers. Please try again.', 500); }

  await logEvent(env.id, 'sent', `Sent by ${owner} to ${b.signers.length} signer${b.signers.length === 1 ? '' : 's'}`, null, clientIp(req));
  const expires = new Date(Date.now() + EXPIRY_DAYS * 86_400_000).toLocaleDateString('en-GB', { dateStyle: 'long' });
  await Promise.all(b.signers.map((s, i) => emailSigningRequest({ to: s.email, name: s.name, sender: owner, title: b.title, message: b.message ?? null, link: signLink(tokens[i]), expires })));
  return NextResponse.json({ ok: true, id: env.id });
}
