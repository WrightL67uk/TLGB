import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { getSessionEmail, sameOrigin } from '@/lib/session';
import { tooMany } from '@/lib/rateLimit';
import { emailSigningReminder } from '@/lib/email';
import { loadEnvelope, logEvent, newToken, tokenHash, signLink } from '@/lib/signing';

export const runtime = 'nodejs';

/** Sender actions: remind everyone still to sign, or cancel. Plain form posts. */
export async function POST(req: NextRequest) {
  const back = (id: string, q = '') => NextResponse.redirect(new URL(`/sign/${id}${q}`, req.url), 303);
  const email = await getSessionEmail();
  if (!sameOrigin(req) || !email) return NextResponse.redirect(new URL('/login?next=/sign', req.url), 303);
  const fd = await req.formData();
  const id = String(fd.get('id') ?? '');
  const action = String(fd.get('action') ?? '');
  const env = await loadEnvelope(id);
  if (!env || env.e.owner_email !== email) return NextResponse.redirect(new URL('/sign', req.url), 303);
  if (env.e.status !== 'sent') return back(id, '?msg=' + encodeURIComponent('That document is no longer waiting for signatures.'));

  if (action === 'cancel') {
    await db().from('signing_envelopes').update({ status: 'cancelled' }).eq('id', id);
    await logEvent(id, 'cancelled', `Cancelled by ${email}`);
    return back(id, '?msg=' + encodeURIComponent('Cancelled. Nobody can sign it now.'));
  }
  if (action === 'remind') {
    if (await tooMany('sign-remind', id, 3, 60 * 24)) return back(id, '?msg=' + encodeURIComponent('You have already sent reminders today.'));
    const waiting = env.signers.filter((s) => s.status !== 'signed');
    for (const s of waiting) {
      // Links are stored hashed, so a reminder carries a fresh link and the old one stops working
      const token = newToken();
      await db().from('signing_signers').update({ token_hash: tokenHash(token), last_reminded_at: new Date().toISOString() }).eq('id', s.id);
      await emailSigningReminder({ to: s.email, name: s.name, sender: email, title: env.e.title, link: signLink(token) });
    }
    await logEvent(id, 'reminded', `Reminder sent to ${waiting.map((s) => s.email).join(', ')}`);
    return back(id, '?msg=' + encodeURIComponent('Reminder sent.'));
  }
  return back(id);
}
