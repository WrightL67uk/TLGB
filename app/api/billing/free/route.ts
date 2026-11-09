import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { ownedBusiness } from '@/lib/account';
import { isPaid } from '@/lib/membership';

export const runtime = 'nodejs';

/** An approved trade chooses the free listing: shown in search as unverified, no member tools. */
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const id = String(fd?.get('business_id') ?? '');
  if (!sameOrigin(req)) return NextResponse.redirect(new URL('/account', req.url), 303);
  const own = await ownedBusiness(id);
  if (!own.ok) return NextResponse.redirect(new URL(own.status === 401 ? '/login?next=/account' : '/account', req.url), 303);
  const b = own.business;
  if (b.status === 'approved' && !isPaid(b) && !b.free_listing) {
    await db().from('businesses').update({ free_listing: true }).eq('id', b.id);
    await db().from('review_events').insert({ business_id: b.id, action: 'billing', actor: 'member', detail: 'Chose the free listing' });
  }
  return NextResponse.redirect(new URL(`/account/${b.id}?free=1`, req.url), 303);
}
