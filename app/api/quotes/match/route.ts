import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ownedBusiness } from '@/lib/account';
import { isPaid } from '@/lib/membership';
import { sameOrigin } from '@/lib/session';
import { lookupPostcode } from '@/lib/postcodes';
import { matchSuppliers } from '@/lib/quotes';
import { QUOTE_CATEGORIES } from '@/lib/quoteTypes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Schema = z.object({
  businessId: z.string().uuid(),
  postcode: z.string().trim().min(2).max(10),
  categories: z.array(z.enum(QUOTE_CATEGORIES.map((c) => c.key) as [string, ...string[]])).min(1).max(10),
});

/** Which suppliers would get this request. Called by the request form as the list changes. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false, error: 'Please use the form on our website.' }, { status: 403 });
  const p = Schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false, error: 'Add a delivery postcode and at least one item.' }, { status: 400 });
  const own = await ownedBusiness(p.data.businessId);
  if (!own.ok) return NextResponse.json({ ok: false, error: own.error }, { status: own.status });
  if (!isPaid(own.business)) return NextResponse.json({ ok: false, error: 'Estimates are included with paid membership.' }, { status: 403 });
  const pc = await lookupPostcode(p.data.postcode);
  if (!pc.ok) return NextResponse.json({ ok: false, error: pc.reason }, { status: 400 });
  const matches = await matchSuppliers(Array.from(new Set(p.data.categories)), pc.lat, pc.lng);
  return NextResponse.json({ ok: true, postcode: pc.postcode, matches });
}
