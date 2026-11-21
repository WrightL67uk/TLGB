import 'server-only';
import { createHash, randomBytes } from 'crypto';
import type { NextRequest } from 'next/server';
import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import { db } from './supabase';
import { siteUrl } from './config';

export const SIGN_BUCKET = 'signing';
export const MAX_PDF_BYTES = 15 * 1024 * 1024;
export const MAX_SIGNERS = 6;
export const EXPIRY_DAYS = 30;

export const sha256 = (b: Buffer | Uint8Array | string) => createHash('sha256').update(b).digest('hex');
export const newToken = () => randomBytes(32).toString('base64url');
export const tokenHash = (t: string) => sha256(`sign:${t}`);
export const signLink = (token: string) => `${siteUrl()}/sign/s/${token}`;
export const clientIp = (req: NextRequest) => (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';

export type Envelope = {
  id: string; created_at: string; owner_email: string; title: string; message: string | null; status: 'sent' | 'completed' | 'declined' | 'cancelled' | 'expired';
  original_path: string; original_name: string; original_sha256: string; final_path: string | null; final_sha256: string | null; expires_at: string; completed_at: string | null;
};
export type Signer = {
  id: string; envelope_id: string; position: number; name: string; email: string; token_hash: string; status: 'waiting' | 'viewed' | 'signed' | 'declined';
  viewed_at: string | null; signed_at: string | null; ip: string | null; user_agent: string | null; signature_png: string | null; signed_name: string | null;
  decline_reason: string | null; last_reminded_at: string | null;
};

export async function logEvent(envelopeId: string, action: string, detail: string | null, signerId: string | null = null, ip: string | null = null) {
  await db().from('signing_events').insert({ envelope_id: envelopeId, signer_id: signerId, action, detail, ip });
}

/** Marks an unfinished envelope as expired once its date has passed. Returns the up-to-date envelope. */
export async function expireIfDue(e: Envelope): Promise<Envelope> {
  if (e.status === 'sent' && new Date(e.expires_at) < new Date()) {
    await db().from('signing_envelopes').update({ status: 'expired' }).eq('id', e.id);
    await logEvent(e.id, 'expired', 'Not signed in time');
    return { ...e, status: 'expired' };
  }
  return e;
}

export async function loadEnvelope(id: string): Promise<{ e: Envelope; signers: Signer[] } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data: e } = await db().from('signing_envelopes').select('*').eq('id', id).maybeSingle();
  if (!e) return null;
  const { data: s } = await db().from('signing_signers').select('*').eq('envelope_id', id).order('position');
  return { e: await expireIfDue(e as Envelope), signers: (s ?? []) as Signer[] };
}

export async function loadByToken(token: string): Promise<{ e: Envelope; signers: Signer[]; me: Signer } | null> {
  if (!token || token.length > 100) return null;
  const { data: me } = await db().from('signing_signers').select('*').eq('token_hash', tokenHash(token)).maybeSingle();
  if (!me) return null;
  const env = await loadEnvelope((me as Signer).envelope_id);
  if (!env) return null;
  return { ...env, me: env.signers.find((s) => s.id === (me as Signer).id) ?? (me as Signer) };
}

export async function download(path: string): Promise<Buffer | null> {
  const { data } = await db().storage.from(SIGN_BUCKET).download(path);
  return data ? Buffer.from(await data.arrayBuffer()) : null;
}

/** Standard PDF fonts only handle Western characters; swap anything else for a question mark. */
const safe = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/[^\x20-\x7e -ÿ]/g, '?');

const when = (iso: string | null) => iso ? new Date(iso).toLocaleString('en-GB', { timeZone: 'Europe/London', dateStyle: 'medium', timeStyle: 'short' }) + ' UK time' : '';

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of safe(text).split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      const t = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(t, size) > width && line) { out.push(line); line = word; } else line = t;
    }
    out.push(line);
  }
  return out;
}

/** Original PDF plus a signature page and a certificate of completion. */
export async function buildSignedPdf(e: Envelope, signers: Signer[], events: { created_at: string; action: string; detail: string | null; signer_id: string | null }[]): Promise<Buffer> {
  const original = await download(e.original_path);
  if (!original) throw new Error('Original document missing');
  const pdf = await PDFDocument.load(original, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const grey = rgb(0.35, 0.35, 0.35);
  const forest = rgb(0.086, 0.247, 0.153);
  const W = 595, H = 842, M = 48;

  // Signature page
  let page = pdf.addPage([W, H]);
  let y = H - M;
  page.drawText('Signatures', { x: M, y: y - 6, size: 20, font: bold, color: forest });
  y -= 34;
  for (const l of wrap(`Document: ${e.title}`, font, 11, W - 2 * M)) { page.drawText(l, { x: M, y, size: 11, font, color: grey }); y -= 15; }
  y -= 10;
  for (const s of signers) {
    if (y < 150) { page = pdf.addPage([W, H]); y = H - M; }
    page.drawRectangle({ x: M, y: y - 104, width: W - 2 * M, height: 110, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.7 });
    page.drawText(safe(s.name), { x: M + 12, y: y - 18, size: 12, font: bold });
    page.drawText(safe(s.email), { x: M + 12, y: y - 33, size: 9, font, color: grey });
    page.drawText(`Signed ${when(s.signed_at)}`, { x: M + 12, y: y - 94, size: 9, font, color: grey });
    if (s.signature_png) {
      try {
        const img = await pdf.embedPng(Buffer.from(s.signature_png.replace(/^data:image\/png;base64,/, ''), 'base64'));
        const sc = Math.min(220 / img.width, 48 / img.height);
        page.drawImage(img, { x: M + 12, y: y - 84, width: img.width * sc, height: img.height * sc });
      } catch { page.drawText(safe(s.signed_name ?? s.name), { x: M + 12, y: y - 70, size: 20, font: bold }); }
    }
    y -= 124;
  }

  // Certificate
  page = pdf.addPage([W, H]);
  y = H - M;
  page.drawText('Certificate of completion', { x: M, y: y - 6, size: 20, font: bold, color: forest });
  y -= 34;
  const row = (label: string, value: string, indent = 120) => {
    if (y < 70) { page = pdf.addPage([W, H]); y = H - M; }
    page.drawText(label, { x: M, y, size: 9, font: bold, color: grey });
    const lines = wrap(value, font, 9, W - 2 * M - indent);
    for (const l of lines) { page.drawText(l, { x: M + indent, y, size: 9, font }); y -= 12; }
    y -= 4;
  };
  row('Document', e.title);
  row('Reference', e.id);
  row('Sent by', e.owner_email);
  row('Sent', when(e.created_at));
  row('Completed', when(e.completed_at));
  row('Original file (SHA-256)', e.original_sha256);
  y -= 8;
  page.drawText('Signers', { x: M, y, size: 12, font: bold, color: forest }); y -= 18;
  for (const s of signers) {
    row('Name', s.name);
    row('Email', `${s.email} (identified by access to a private link sent to this address)`);
    row('Opened', when(s.viewed_at));
    row('Signed', when(s.signed_at));
    row('IP address', s.ip ?? '');
    row('Signed as', s.signed_name ?? '');
    y -= 6;
  }
  page.drawText('Activity', { x: M, y, size: 12, font: bold, color: forest }); y -= 18;
  for (const ev of events) {
    const who = signers.find((s) => s.id === ev.signer_id)?.name;
    row(when(ev.created_at), `${ev.action}${who ? ` (${who})` : ''}${ev.detail ? `: ${ev.detail}` : ''}`, 150);
  }
  y -= 8;
  for (const l of wrap('The Little Green Book (TLGB) only provided the signing service. It did not write, review or take part in this agreement, gives no legal advice about it, and is not a party to it. The SHA-256 fingerprint above identifies the original file that was sent for signing.', font, 8, W - 2 * M)) {
    if (y < 40) { page = pdf.addPage([W, H]); y = H - M; }
    page.drawText(l, { x: M, y, size: 8, font, color: grey }); y -= 11;
  }
  return Buffer.from(await pdf.save());
}

/** Runs once the last signer has signed: builds the final PDF, stores it and marks the envelope complete. */
export async function finishEnvelope(envelopeId: string): Promise<{ e: Envelope; signers: Signer[] } | null> {
  const env = await loadEnvelope(envelopeId);
  if (!env || env.e.status !== 'sent' || env.signers.some((s) => s.status !== 'signed')) return null;
  const completedAt = new Date().toISOString();
  const e = { ...env.e, completed_at: completedAt };
  await logEvent(e.id, 'completed', 'All signers have signed');
  const { data: events } = await db().from('signing_events').select('created_at, action, detail, signer_id').eq('envelope_id', e.id).order('created_at');
  const bytes = await buildSignedPdf(e, env.signers, events ?? []);
  const path = `${e.id}/signed.pdf`;
  const up = await db().storage.from(SIGN_BUCKET).upload(path, bytes, { contentType: 'application/pdf', upsert: true });
  if (up.error) throw up.error;
  await db().from('signing_envelopes').update({ status: 'completed', completed_at: completedAt, final_path: path, final_sha256: sha256(bytes) }).eq('id', e.id);
  return loadEnvelope(e.id);
}
