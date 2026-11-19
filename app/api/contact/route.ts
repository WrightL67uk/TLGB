import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { tooMany, visitor, TOO_MANY } from '@/lib/rateLimit';
import { CONTACT_ROLES, roleLabel } from '@/lib/contact';
import { emailContactMessage } from '@/lib/email';

export const runtime = 'nodejs';

const blank = (v: unknown) => (v === '' || v == null ? undefined : v);
const Schema = z.object({
  who: z.enum(CONTACT_ROLES.map((r) => r.key) as [string, ...string[]]),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  business: z.preprocess(blank, z.string().trim().max(160).optional()),
  message: z.string().trim().min(5).max(3000),
});

// The support window on every page posts with this header and gets JSON back; the contact page gets redirects.
const wantsJson = (req: NextRequest) => !!req.headers.get('x-tlgb-fetch');
const back = (req: NextRequest, q: string) => wantsJson(req) ? NextResponse.json({ ok: true }) : NextResponse.redirect(new URL(`/contact?${q}`, req.url), 303);
const fail = (req: NextRequest, msg: string, who?: string) => wantsJson(req)
  ? NextResponse.json({ ok: false, error: msg }, { status: 400 })
  : back(req, `error=${encodeURIComponent(msg)}${who ? `&who=${encodeURIComponent(who)}` : ''}`);

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail(req, 'Please send the form from our website.');
  const fd = await req.formData().catch(() => null);
  if (!fd) return fail(req, 'Something went wrong. Please try again.');
  // Bots fill every field; people never see this one
  if (String(fd.get('company_url') ?? '')) return back(req, 'sent=1');
  // The support window does not ask who you are, so it sends what it knows or "other"
  const who = String(fd.get('who') ?? '') || (wantsJson(req) ? 'other' : '');
  const page = String(fd.get('page') ?? '').slice(0, 200);
  const parsed = Schema.safeParse({ who, name: fd.get('name'), email: fd.get('email'), business: fd.get('business'), message: fd.get('message') });
  if (!parsed.success) {
    const paths = parsed.error.issues.map((i) => i.path[0]);
    const msg = paths.includes('who') ? 'Please choose who you are.'
      : paths.includes('email') ? 'Please check your email address.'
      : paths.includes('message') ? 'Please write a short message.'
      : 'Please check your name.';
    return fail(req, msg, who);
  }
  if (await tooMany('contact', visitor(req), 5, 60)) return fail(req, TOO_MANY, who);
  const m = parsed.data;

  // Keep a copy in admin (Resources > enquiries). If saving fails the email still goes.
  const { error } = await db().from('service_enquiries').insert({
    service: 'contact', name: m.name, business_name: m.business ?? null, email: m.email,
    schemes: [roleLabel(m.who)], message: page ? `${m.message}\n\n(Sent from ${page})` : m.message,
  });
  if (error) console.error('contact save failed', error);

  await emailContactMessage({ who: roleLabel(m.who), name: m.name, email: m.email, business: m.business ?? null, message: m.message, page: page || null });
  return back(req, 'sent=1');
}
