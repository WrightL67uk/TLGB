import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/session';
import { getAgency } from '@/lib/agencies';
import { stripe, stripeEnabled } from '@/lib/stripe';
import { siteUrl } from '@/lib/config';

export const runtime = 'nodejs';

/** Stripe's own page for changing card, downloading invoices or cancelling. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.redirect(new URL('/recruiter', req.url), 303);
  const a = await getAgency();
  if (!a) return NextResponse.redirect(new URL('/login?next=/recruiter', req.url), 303);
  if (!stripeEnabled() || !a.stripe_customer_id) return NextResponse.redirect(new URL('/recruiter', req.url), 303);
  try {
    const s = await stripe('POST', 'billing_portal/sessions', { customer: a.stripe_customer_id, return_url: `${siteUrl()}/recruiter` });
    return NextResponse.redirect(s.url as string, 303);
  } catch (err) {
    console.error('agency portal failed', err);
    return NextResponse.redirect(new URL(`/recruiter?billing=${encodeURIComponent('Billing is not available right now. Please try again shortly.')}`, req.url), 303);
  }
}
