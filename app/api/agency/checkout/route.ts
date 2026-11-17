import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/session';
import { getAgency, getAgencyPlan } from '@/lib/agencies';
import { stripe, stripeEnabled } from '@/lib/stripe';
import { siteUrl } from '@/lib/config';
import { db } from '@/lib/supabase';

export const runtime = 'nodejs';

const back = (req: NextRequest, q: string) => NextResponse.redirect(new URL(`/recruiter?${q}`, req.url), 303);

/** Sends an approved agency to Stripe to start its monthly plan. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.redirect(new URL('/recruiter', req.url), 303);
  const a = await getAgency();
  if (!a) return NextResponse.redirect(new URL('/login?next=/recruiter', req.url), 303);
  if (a.status !== 'approved') return back(req, 'billing=' + encodeURIComponent('You can start the plan once your agency is approved.'));
  if (!stripeEnabled()) return back(req, 'billing=' + encodeURIComponent('Online payment is not switched on yet. We will be in touch.'));
  if (['active', 'trialing', 'past_due'].includes(a.subscription_status)) return back(req, 'billing=' + encodeURIComponent('Your plan is already active. Use Manage billing to change it.'));
  try {
    const plan = await getAgencyPlan();
    let customer = a.stripe_customer_id;
    if (!customer) {
      const c = await stripe('POST', 'customers', { email: a.email, name: a.name, metadata: { agency_id: a.id } });
      customer = c.id as string;
      await db().from('agencies').update({ stripe_customer_id: customer }).eq('id', a.id);
    }
    const meta = { agency_id: a.id, credits: String(plan.credits) };
    const tax = process.env.STRIPE_AUTOMATIC_TAX === '1';
    const session = await stripe('POST', 'checkout/sessions', {
      mode: 'subscription',
      customer,
      client_reference_id: a.id,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'gbp',
          unit_amount: plan.price * 100,
          recurring: { interval: 'month' },
          product_data: { name: `The Little Green Book recruitment agency plan (${plan.credits} vacancy credits a month)` },
          ...(tax ? { tax_behavior: 'exclusive' } : {}),
        },
      }],
      subscription_data: { metadata: meta },
      metadata: meta,
      allow_promotion_codes: 'true',
      billing_address_collection: 'auto',
      customer_update: { address: 'auto', name: 'auto' },
      ...(tax ? { automatic_tax: { enabled: 'true' }, tax_id_collection: { enabled: 'true' } } : {}),
      success_url: `${siteUrl()}/recruiter?paid=1`,
      cancel_url: `${siteUrl()}/recruiter`,
    });
    return NextResponse.redirect(session.url as string, 303);
  } catch (err) {
    console.error('agency checkout failed', err);
    return back(req, 'billing=' + encodeURIComponent('We could not open the payment page. Please try again in a minute.'));
  }
}
