import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { findPartnerByCode, PARTNER_COOKIE, PARTNER_DAYS } from '@/lib/partners';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** A partner's own link, tlgb.co.uk/p/CODE: remembers who sent the visitor for 90 days, then opens the sign-up. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const res = NextResponse.redirect(new URL('/join', req.url), 307);
  const partner = await findPartnerByCode(code, { approvedOnly: true }).catch(() => null);
  if (partner) {
    res.cookies.set(PARTNER_COOKIE, partner.code, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * PARTNER_DAYS,
    });
    // A visit count for the partner's dashboard. Nothing about the visitor is stored.
    await db().from('partner_clicks').insert({ partner_id: partner.id }).then(() => null, () => null);
  }
  return res;
}
