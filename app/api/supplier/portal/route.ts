import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/session';
import { ownedSupplier } from '@/lib/supplierAccount';
import { stripe, stripeEnabled } from '@/lib/stripe';
import { siteUrl } from '@/lib/config';

export const runtime = 'nodejs';

/** Stripe's own page for changing card, downloading invoices or cancelling. */
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const id = String(fd?.get('supplier_id') ?? '');
  if (!sameOrigin(req)) return NextResponse.redirect(new URL('/account', req.url), 303);
  const own = await ownedSupplier(id);
  if (!own.ok) return NextResponse.redirect(new URL('/login?next=/account', req.url), 303);
  const customer = own.supplier.stripe_customer_id;
  if (!stripeEnabled() || !customer) return NextResponse.redirect(new URL(`/supplier/${id}`, req.url), 303);
  try {
    const s = await stripe('POST', 'billing_portal/sessions', { customer, return_url: `${siteUrl()}/supplier/${id}` });
    return NextResponse.redirect(s.url as string, 303);
  } catch (err) {
    console.error('supplier portal failed', err);
    return NextResponse.redirect(new URL(`/supplier/${id}?billing=${encodeURIComponent('Billing is not available right now. Please try again shortly.')}`, req.url), 303);
  }
}
