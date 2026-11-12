import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { TURNOVER_BANDS } from '@/lib/config';
import { checkCompany } from '@/lib/companiesHouse';
import { cleanCode, CODE_COOKIE } from '@/lib/discounts';
import { canLogIn, passwordProblem, setPassword } from '@/lib/passwords';
import { createSession, sameOrigin, sessionCookieOptions, SESSION_COOKIE } from '@/lib/session';
import { getPricing } from '@/lib/pricing';
import { emailAdminBilling } from '@/lib/email';
import { stripeEnabled } from '@/lib/stripe';
import { openCheckout } from '@/lib/checkout';
import { tooMany, visitor, TOO_MANY } from '@/lib/rateLimit';
import type { Business } from '@/lib/account';

export const runtime = 'nodejs';

// The account step of sign-up (after choosing a plan): business set-up, turnover, name, email and password.
// Creates the listing as 'started' (hidden) and logs them in. Paid plans go straight to Stripe; free goes to the details.

const bandKeys = TURNOVER_BANDS.map((b) => b.key) as [string, ...string[]];
const Body = z.object({
  business_type: z.enum(['ltd', 'sole_trader'], { message: 'Choose how your business is set up' }),
  company_number: z.string().trim().max(10).optional(),
  trading_name: z.string().trim().max(120).optional(),
  turnover_band: z.enum(bandKeys, { message: 'Choose your annual turnover' }),
  does_domestic: z.enum(['yes', 'no'], { message: 'Tell us whether you do domestic work' }),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string(),
  terms: z.literal(true, { message: 'Please agree to the terms to continue' }),
  hp: z.string().optional(),
  plan: z.enum(['free', 'month', 'year']).optional(),
});

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail('Request blocked.', 403);
  if (await tooMany('signup', visitor(req), 10, 60)) return fail(TOO_MANY, 429);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const d = parsed.data;
  if (d.hp) return NextResponse.json({ ok: true, next: '/join/thanks' }); // bot

  const pwProblem = passwordProblem(d.password);
  if (pwProblem) return fail(`Password: ${pwProblem}`);

  // One account per email
  if (await canLogIn(d.email)) return fail('There is already an account with this email. Log in instead, or use a different email.');

  let company: Awaited<ReturnType<typeof checkCompany>> | null = null;
  let tradingName = (d.trading_name ?? '').trim();
  if (d.business_type === 'ltd') {
    if (!d.company_number) return fail('Find your company on Companies House and pick it from the list.');
    company = await checkCompany(d.company_number);
    if (!company.ok) return fail(company.reason);
    const { count } = await db().from('businesses').select('id', { count: 'exact', head: true })
      .eq('company_number', company.companyNumber).not('status', 'in', '(rejected,draft)');
    if (count) return fail('This company already has a listing, or one is being set up. If it is yours, log in instead.');
    if (!tradingName) tradingName = company.name;
  }
  if (tradingName.length < 2) return fail('Enter your business name.');

  const ch = company && company.ok ? company : null;
  const { data: biz, error } = await db().from('businesses').insert({
    status: 'started',
    business_type: d.business_type,
    company_number: ch?.companyNumber ?? null,
    ch_company_name: ch?.name ?? null,
    ch_status: ch?.status ?? null,
    ch_incorporated_on: ch?.incorporatedOn ?? null,
    ch_registered_address: ch?.registeredAddress ?? null,
    ch_raw: ch?.raw ?? null,
    trading_name: tradingName,
    email: d.email,
    turnover_band: d.turnover_band,
    does_domestic: d.does_domestic === 'yes',
    signup_code: cleanCode(req.cookies.get(CODE_COOKIE)?.value) || null,
    ...(d.plan === 'free' ? { free_listing: true } : {}),
  }).select('*').single();
  if (error || !biz) {
    console.error('quick signup insert failed', error);
    return fail('Something went wrong. Please try again.', 500);
  }

  const { error: pwErr } = await setPassword(d.email, d.password);
  if (pwErr) console.error('signup password failed', pwErr);
  await db().from('review_events').insert({ business_id: biz.id, action: 'billing', actor: d.email, detail: 'Signed up (quick start)' }).then(() => null, () => null);
  const planText = d.plan === 'free' ? 'chose the free listing' : d.plan ? `chose verified ${d.plan === 'month' ? 'monthly' : 'yearly'} and is going to payment` : 'has started';
  await emailAdminBilling(`New sign-up: ${tradingName}`, `${tradingName} (${d.email}) has signed up and ${planText}. Their details are not sent yet.`, biz.id).catch(() => null);

  // Where next: free and other pricing options go to the details; paid plans go straight to Stripe.
  const pricing = await getPricing();
  let next = `/account/${biz.id}/details`;
  if (pricing.mode === 'membership' && d.plan !== 'free') {
    next = `/account/${biz.id}/plan`;
    if (d.plan && stripeEnabled()) {
      try {
        const r = await openCheckout(biz as Business, pricing, { interval: d.plan });
        next = 'url' in r ? r.url : `${next}?billing=${encodeURIComponent(r.error)}`;
      } catch (e) {
        console.error('signup checkout failed', e);
        next = `${next}?billing=${encodeURIComponent('We could not open the payment page. Please try again.')}`;
      }
    }
  }
  if (d.plan === 'free') await db().from('review_events').insert({ business_id: biz.id, action: 'billing', actor: 'member', detail: 'Chose the free listing' }).then(() => null, () => null);

  const { raw, expires } = await createSession(d.email);
  const res = NextResponse.json({ ok: true, next });
  res.cookies.set(SESSION_COOKIE, raw, sessionCookieOptions(expires));
  return res;
}
