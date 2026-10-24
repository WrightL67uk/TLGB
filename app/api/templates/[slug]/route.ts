import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { getMembership, isPaid } from '@/lib/membership';
import { templateBySlug, templateDoc } from '@/lib/templates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Downloads a starter policy or RAMS as an editable Word document. Paying members only. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = templateBySlug(slug);
  if (!t) return new NextResponse('Template not found', { status: 404 });

  const m = await getMembership();
  if (!m.loggedIn) return NextResponse.redirect(new URL(`/login?next=/account/compliance`, req.url), 303);
  if (!m.paid) return NextResponse.redirect(new URL(m.unpaidId ? `/account/${m.unpaidId}` : '/account', req.url), 303);

  const { data: rows } = await db().from('businesses').select('trading_name, status, founding_member, subscription_status').eq('email', m.email!);
  const company = (rows ?? []).find(isPaid)?.trading_name ?? '';
  const file = `${t.title.replace(/[^A-Za-z0-9 ]+/g, '').trim()}.doc`;
  return new NextResponse(templateDoc(t, company), {
    headers: {
      'content-type': 'application/msword; charset=utf-8',
      'content-disposition': `attachment; filename="${file}"`,
      'cache-control': 'private, no-store',
    },
  });
}
