import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/session';
import { ownedSupplier, isSubscribed } from '@/lib/supplierAccount';
import { stripeEnabled } from '@/lib/stripe';
import { getSupplierPricing, tierKey } from '@/lib/supplierPricing';
import { openSupplierCheckout } from '@/lib/supplierCheckout';
import { db } from '@/lib/supabase';

export const runtime = 'nodejs';

const back = (req: NextRequest, id: string, q: string) => NextResponse.redirect(new URL(`/supplier/${id}?${q}`, req.url), 303);

/** Sends a supplier to Stripe to pay for (or switch to) a yearly plan. */
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const id = String(fd?.get('supplier_id') ?? '');
  if (!sameOrigin(req)) return NextResponse.redirect(new URL('/account', req.url), 303);
  const own = await ownedSupplier(id);
  if (!own.ok) return NextResponse.redirect(new URL('/login?next=/account', req.url), 303);
  const s = own.supplier;
  const tier = tierKey(fd?.get('tier')) ?? s.tier ?? 'appear';
  if (!stripeEnabled()) return back(req, id, 'billing=' + encodeURIComponent('Online payment is not switched on yet. We will be in touch.'));
  if (isSubscribed(s)) return back(req, id, 'billing=' + encodeURIComponent('Your plan is already active. Use Manage billing to change it.'));
  try {
    if (tier !== s.tier) await db().from('suppliers').update({ tier }).eq('id', s.id);
    const r = await openSupplierCheckout({ ...s, tier }, await getSupplierPricing(), tier);
    if ('error' in r) return back(req, id, 'billing=' + encodeURIComponent(r.error));
    return NextResponse.redirect(r.url, 303);
  } catch (err) {
    console.error('supplier checkout failed', err);
    return back(req, id, 'billing=' + encodeURIComponent('We could not open the payment page. Please try again in a minute.'));
  }
}
