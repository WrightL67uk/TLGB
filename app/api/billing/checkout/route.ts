import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { ownedBusiness } from '@/lib/account';
import { isPaid } from '@/lib/membership';
import { stripe, stripeEnabled } from '@/lib/stripe';
import { siteUrl, turnoverBand } from '@/lib/config';

export const runtime = 'nodejs';

const back = (req: NextRequest, id: string, q: string) => NextResponse.redirect(new URL(`/account/${id}?${q}`, req.url), 303);

/** Sends an approved trade to Stripe's payment page for a yearly listing at their turnover band price. */
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const id = String(fd?.get('business_id') ?? '');
  if (!sameOrigin(req)) return NextResponse.redirect(new URL('/account', req.url), 303);
  const own = await ownedBusiness(id);
  if (!own.ok) return NextResponse.redirect(new URL(own.status === 401 ? '/login?next=/account' : '/account', req.url), 303);
  const b = own.business;

  if (!stripeEnabled()) return back(req, id, 'billing=' + encodeURIComponent('Online payment is not switched on yet. We will be in touch.'));
  if (b.status !== 'approved') return back(req, id, 'billing=' + encodeURIComponent('You can pay once your listing has been approved.'));
  if (isPaid(b)) return back(req, id, 'billing=' + encodeURIComponent('Your membership is already active.'));
  const band = turnoverBand(b.turnover_band);
  if (!band) return back(req, id, 'billing=' + encodeURIComponent('Choose your annual turnover below and save, then try again.'));

  try {
    let customer = b.stripe_customer_id;
    if (!customer) {
      const c = await stripe('POST', 'customers', {
        email: b.email,
        name: b.trading_name,
        metadata: { business_id: b.id },
      });
      customer = c.id as string;
      await db().from('businesses').update({ stripe_customer_id: customer }).eq('id', b.id);
    }
    const trial = Number(process.env.STRIPE_TRIAL_DAYS || 0);
    const tax = process.env.STRIPE_AUTOMATIC_TAX === '1';
    const session = await stripe('POST', 'checkout/sessions', {
      mode: 'subscription',
      customer,
      client_reference_id: b.id,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'gbp',
          unit_amount: band.price * 100,
          recurring: { interval: 'year' },
          product_data: { name: `The Little Green Book listing (${band.label} turnover)` },
          ...(tax ? { tax_behavior: 'exclusive' } : {}),
        },
      }],
      subscription_data: {
        metadata: { business_id: b.id },
        ...(trial > 0 ? { trial_period_days: trial } : {}),
      },
      metadata: { business_id: b.id },
      allow_promotion_codes: 'true',
      billing_address_collection: 'auto',
      customer_update: { address: 'auto', name: 'auto' },
      ...(tax ? { automatic_tax: { enabled: 'true' }, tax_id_collection: { enabled: 'true' } } : {}),
      success_url: `${siteUrl()}/account/${b.id}?paid=1`,
      cancel_url: `${siteUrl()}/account/${b.id}`,
    });
    return NextResponse.redirect(session.url as string, 303);
  } catch (err) {
    console.error('checkout failed', err);
    return back(req, id, 'billing=' + encodeURIComponent('We could not open the payment page. Please try again in a minute.'));
  }
}
