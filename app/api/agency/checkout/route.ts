import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/session';
import { getAgency } from '@/lib/agencies';
import { agencyCheckoutUrl } from '@/lib/agencyCheckout';
import { stripeEnabled } from '@/lib/stripe';

export const runtime = 'nodejs';

const back = (req: NextRequest, q: string) => NextResponse.redirect(new URL(`/recruiter?${q}`, req.url), 303);

/** Sends an approved agency to Stripe to start its annual plan. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.redirect(new URL('/recruiter', req.url), 303);
  const a = await getAgency();
  if (!a) return NextResponse.redirect(new URL('/login?next=/recruiter', req.url), 303);
  if (a.status === 'rejected' || a.status === 'suspended') return back(req, 'billing=' + encodeURIComponent('This account cannot take a plan. Contact admin@tlgb.co.uk.'));
  if (!stripeEnabled()) return back(req, 'billing=' + encodeURIComponent('Online payment is not switched on yet. We will be in touch.'));
  if (['active', 'trialing', 'past_due'].includes(a.subscription_status)) return back(req, 'billing=' + encodeURIComponent('Your plan is already active. Use Manage billing to change it.'));
  try {
    const url = await agencyCheckoutUrl(a, '/recruiter');
    if (!url) return back(req, 'billing=' + encodeURIComponent('Online payment is not switched on yet. We will be in touch.'));
    return NextResponse.redirect(url, 303);
  } catch (err) {
    console.error('agency checkout failed', err);
    return back(req, 'billing=' + encodeURIComponent('We could not open the payment page. Please try again in a minute.'));
  }
}
