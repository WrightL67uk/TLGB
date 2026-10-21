import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { getMembership } from '@/lib/membership';
import { lookupPostcode } from '@/lib/postcodes';
import { TRADES } from '@/lib/config';
import { HELP_KINDS } from '@/lib/resources';
import { emailAdminHelpRequest } from '@/lib/email';

export const runtime = 'nodejs';

const kinds = HELP_KINDS.map((k) => k.key) as [string, ...string[]];
const slugs = TRADES.map((t) => t.slug) as [string, ...string[]];
const blank = (v: unknown) => (v === '' || v == null ? undefined : v);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Schema = z.object({
  kind: z.enum(kinds, { message: 'Choose the kind of help' }),
  title: z.string().trim().min(5, 'Add a headline').max(120),
  details: z.string().trim().min(20, 'Add a bit more detail').max(2000),
  trades: z.array(z.enum(slugs)).max(15),
  postcode: z.string().trim().min(5).max(10),
  town: z.preprocess(blank, z.string().trim().max(80).optional()),
  needed_from: z.preprocess(blank, date.optional()),
  needed_until: z.preprocess(blank, date.optional()),
});

const back = (req: NextRequest, path: string) => NextResponse.redirect(new URL(path, req.url), 303);
const err = (req: NextRequest, m: string) => back(req, `/help-board/new?error=${encodeURIComponent(m)}`);

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return err(req, 'Please send the form from our website.');
  const m = await getMembership();
  if (!m.loggedIn || !m.email) return back(req, '/login?next=/help-board/new');
  if (!m.paid) return back(req, '/help-board');
  const email = m.email;
  const fd = await req.formData().catch(() => null);
  if (!fd) return err(req, 'Something went wrong. Please try again.');
  const parsed = Schema.safeParse({
    kind: fd.get('kind'), title: fd.get('title'), details: fd.get('details'), trades: fd.getAll('trades').map(String),
    postcode: fd.get('postcode'), town: fd.get('town'), needed_from: fd.get('needed_from'), needed_until: fd.get('needed_until'),
  });
  if (!parsed.success) return err(req, parsed.error.issues[0]?.message ?? 'Please check the form.');
  const r = parsed.data;
  const pc = await lookupPostcode(r.postcode);
  if (!pc.ok) return err(req, pc.reason);

  // A handful of open requests each is plenty, and stops the board being flooded
  const { count } = await db().from('help_requests').select('id', { count: 'exact', head: true }).eq('email', email).eq('status', 'open');
  if ((count ?? 0) >= 5) return err(req, 'You already have five open requests. Close one before posting another.');

  const { data: biz } = await db().from('businesses').select('trading_name').eq('email', email).neq('status', 'draft').limit(1).maybeSingle();
  const { error } = await db().from('help_requests').insert({
    email, business_name: biz?.trading_name ?? null, kind: r.kind, title: r.title, details: r.details, trades: r.trades,
    postcode: pc.postcode, lat: pc.lat, lng: pc.lng, town: r.town ?? null,
    needed_from: r.needed_from ?? null, needed_until: r.needed_until ?? null,
  });
  if (error) {
    console.error('help request save failed', error);
    return err(req, 'Something went wrong. Please try again.');
  }
  await emailAdminHelpRequest(biz?.trading_name ?? null, email, r.title, r.details);
  return back(req, '/help-board?posted=1');
}
