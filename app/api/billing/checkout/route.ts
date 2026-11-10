import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/session';
import { ownedBusiness } from '@/lib/account';
import { isPaid, PAID_STATUSES } from '@/lib/membership';
import { stripeEnabled } from '@/lib/stripe';
import { getPricing } from '@/lib/pricing';
import { openCheckout } from '@/lib/checkout';

export const runtime = 'nodejs';

const back = (req: NextRequest, id: string, q: string) => NextResponse.redirect(new URL(`/account/${id}?${q}`, req.url), 303);

/** Sends an approved trade to Stripe's payment page for a yearly membership, at their turnover band price or their chosen plan's price (set on the admin Prices page). */
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const id = String(fd?.get('business_id') ?? '');
  if (!sameOrigin(req)) return NextResponse.redirect(new URL('/account', req.url), 303);
  const own = await ownedBusiness(id);
  if (!own.ok) return NextResponse.redirect(new URL(own.status === 401 ? '/login?next=/account' : '/account', req.url), 303);
  const b = own.business;

  if (!stripeEnabled()) return back(req, id, 'billing=' + encodeURIComponent('Online payment is not switched on yet. We will be in touch.'));
  const pricing = await getPricing();
  // Quick sign-ups choose and pay before sending their details; everyone else pays once approved
  const startedOk = b.status === 'started' && pricing.mode === 'membership';
  if (b.status !== 'approved' && !startedOk) return back(req, id, 'billing=' + encodeURIComponent('You can pay once your listing has been approved.'));
  if (isPaid(b) || (startedOk && PAID_STATUSES.includes(b.subscription_status))) return back(req, id, 'billing=' + encodeURIComponent('Your membership is already active.'));
  try {
    const r = await openCheckout(b, pricing, { interval: fd?.get('interval'), plan: fd?.get('plan') });
    if ('error' in r) return back(req, id, 'billing=' + encodeURIComponent(r.error));
    return NextResponse.redirect(r.url, 303);
  } catch (err) {
    console.error('checkout failed', err);
    return back(req, id, 'billing=' + encodeURIComponent('We could not open the payment page. Please try again in a minute.'));
  }
}
