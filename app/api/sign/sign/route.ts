import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { tooMany, visitor, TOO_MANY } from '@/lib/rateLimit';
import { emailSigningComplete, emailSigningDeclined } from '@/lib/email';
import { loadByToken, finishEnvelope, download, logEvent, clientIp } from '@/lib/signing';

export const runtime = 'nodejs';
export const maxDuration = 30;

const fail = (msg: string, status = 400) => NextResponse.json({ ok: false, error: msg }, { status });

/** A signer signs or declines. The private link in their email is how we know who they are. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail('Please use the link from your email.');
  const body = await req.json().catch(() => null) as { token?: string; action?: string; signature?: string; signedName?: string; reason?: string; agree?: boolean } | null;
  if (!body?.token) return fail('Something went wrong. Please reopen the link in your email.');
  if (await tooMany('sign-act', visitor(req), 20, 60)) return fail(TOO_MANY);
  const t = await loadByToken(body.token);
  if (!t) return fail('This link is not valid.', 404);
  if (t.e.status !== 'sent') return fail(t.e.status === 'completed' ? 'This document has already been signed by everyone.' : `This document can no longer be signed (${t.e.status}).`);
  if (t.me.status === 'signed') return fail('You have already signed this document.');
  const ip = clientIp(req), ua = (req.headers.get('user-agent') ?? '').slice(0, 300);

  if (body.action === 'decline') {
    const reason = String(body.reason ?? '').trim().slice(0, 1000) || null;
    await db().from('signing_signers').update({ status: 'declined', decline_reason: reason, ip, user_agent: ua }).eq('id', t.me.id);
    await db().from('signing_envelopes').update({ status: 'declined' }).eq('id', t.e.id);
    await logEvent(t.e.id, 'declined', reason, t.me.id, ip);
    await emailSigningDeclined({ to: t.e.owner_email, title: t.e.title, who: t.me.name, reason });
    return NextResponse.json({ ok: true });
  }

  if (!body.agree) return fail('Please tick the box to confirm you have read the document and agree to sign electronically.');
  const png = String(body.signature ?? '');
  const signedName = String(body.signedName ?? '').trim().slice(0, 120);
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(png) || png.length > 400_000) return fail('Please add your signature.');
  if (signedName.length < 2) return fail('Please type your full name.');

  const { data: upd } = await db().from('signing_signers').update({
    status: 'signed', signed_at: new Date().toISOString(), ip, user_agent: ua, signature_png: png, signed_name: signedName,
    viewed_at: t.me.viewed_at ?? new Date().toISOString(),
  }).eq('id', t.me.id).neq('status', 'signed').select('id');
  if (!upd?.length) return fail('You have already signed this document.');
  await logEvent(t.e.id, 'signed', `Agreed to sign electronically as "${signedName}"`, t.me.id, ip);

  try {
    const done = await finishEnvelope(t.e.id);
    if (done?.e.final_path) {
      const pdf = await download(done.e.final_path);
      if (pdf) await emailSigningComplete({ to: [...new Set([done.e.owner_email, ...done.signers.map((s) => s.email)])], title: done.e.title, pdf, fileName: `signed-${done.e.title.replace(/[^\w .-]/g, '').slice(0, 60) || 'document'}.pdf` });
    }
  } catch (err) {
    console.error('finish envelope failed', t.e.id, err);
  }
  return NextResponse.json({ ok: true });
}
