import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { checkCompany } from '@/lib/companiesHouse';
import { cleanCode, CODE_COOKIE } from '@/lib/discounts';
import { canLogIn, passwordProblem, setPassword } from '@/lib/passwords';
import { createSession, sameOrigin, sessionCookieOptions, SESSION_COOKIE } from '@/lib/session';
import { stripeEnabled } from '@/lib/stripe';
import { getSupplierPricing } from '@/lib/supplierPricing';
import { openSupplierCheckout } from '@/lib/supplierCheckout';
import { cleanVat, freeSlug, vatOk, type Supplier } from '@/lib/supplierAccount';
import { emailAdminSupplier } from '@/lib/email';
import { tooMany, visitor, TOO_MANY } from '@/lib/rateLimit';

export const runtime = 'nodejs';

// Step 2 of supplier sign-up (after choosing Appear or Match): who they are, VAT, name, email and password.
// Creates the supplier as 'started' (hidden), logs them in and sends them straight to Stripe.

const Body = z.object({
  tier: z.enum(['appear', 'match'], { message: 'Choose a plan first' }),
  business_type: z.enum(['ltd', 'sole_trader'], { message: 'Choose how your business is set up' }),
  company_number: z.string().trim().max(10).optional(),
  trading_name: z.string().trim().max(120).optional(),
  contact_name: z.string().trim().min(2, 'Enter your name').max(80),
  phone: z.string().trim().min(6, 'Enter a phone number').max(30),
  vat_registered: z.enum(['yes', 'no'], { message: 'Tell us whether you are VAT registered' }),
  vat_number: z.string().trim().max(20).optional(),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string(),
  terms: z.literal(true, { message: 'Please agree to the terms to continue' }),
  hp: z.string().optional(),
});

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail('Request blocked.', 403);
  if (await tooMany('supplier-signup', visitor(req), 10, 60)) return fail(TOO_MANY, 429);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const d = parsed.data;
  if (d.hp) return NextResponse.json({ ok: true, next: '/suppliers' }); // bot

  const pwProblem = passwordProblem(d.password);
  if (pwProblem) return fail(`Password: ${pwProblem}`);
  if (await canLogIn(d.email)) return fail('There is already an account with this email. Log in instead, or use a different email.');
  const { count: already } = await db().from('suppliers').select('id', { count: 'exact', head: true }).eq('email', d.email).neq('status', 'rejected');
  if (already) return fail('There is already a supplier with this email. Log in instead, or use a different email.');

  // VAT: registered businesses give their number (format checked here, checked against HMRC's register when we approve)
  let vatNumber: string | null = null;
  if (d.vat_registered === 'yes') {
    if (!d.vat_number || !vatOk(d.vat_number)) return fail('Enter your VAT number: 9 digits, or 12 if you are in a VAT group, with or without GB.');
    vatNumber = cleanVat(d.vat_number);
  }

  // Companies House check for limited companies
  let ch: Extract<Awaited<ReturnType<typeof checkCompany>>, { ok: true }> | null = null;
  let name = (d.trading_name ?? '').trim();
  if (d.business_type === 'ltd') {
    if (!d.company_number) return fail('Find your company on Companies House and pick it from the list.');
    const company = await checkCompany(d.company_number);
    if (!company.ok) return fail(company.reason);
    ch = company;
    const { count } = await db().from('suppliers').select('id', { count: 'exact', head: true }).eq('company_number', company.companyNumber).neq('status', 'rejected');
    if (count) return fail('This company already has a supplier listing, or one is being set up. If it is yours, log in instead.');
    if (!name) name = company.name;
  }
  if (name.length < 2) return fail('Enter your business name.');

  const { data: row, error } = await db().from('suppliers').insert({
    status: 'started',
    tier: d.tier,
    name,
    slug: await freeSlug(name),
    contact_name: d.contact_name,
    phone: d.phone,
    email: d.email,
    submitted_by: d.email,
    business_type: d.business_type,
    company_number: ch?.companyNumber ?? null,
    ch_company_name: ch?.name ?? null,
    ch_status: ch?.status ?? null,
    ch_incorporated_on: ch?.incorporatedOn ?? null,
    ch_registered_address: ch?.registeredAddress ?? null,
    vat_registered: d.vat_registered === 'yes',
    vat_number: vatNumber,
    categories: [],
    signup_code: cleanCode(req.cookies.get(CODE_COOKIE)?.value) || null,
  }).select('*').single();
  if (error || !row) {
    console.error('supplier signup insert failed', error);
    return fail('Something went wrong. Please try again.', 500);
  }

  const { error: pwErr } = await setPassword(d.email, d.password);
  if (pwErr) console.error('supplier signup password failed', pwErr);
  await emailAdminSupplier(`New supplier sign-up: ${name}`, `${name} (${d.email}) has chosen ${d.tier === 'match' ? 'Match' : 'Appear'} and is going to payment. Their details are not sent yet.`, row.id).catch(() => null);

  let next = `/supplier/${row.id}`;
  if (stripeEnabled()) {
    try {
      const r = await openSupplierCheckout(row as Supplier, await getSupplierPricing(), d.tier);
      next = 'url' in r ? r.url : `${next}?billing=${encodeURIComponent(r.error)}`;
    } catch (e) {
      console.error('supplier signup checkout failed', e);
      next = `${next}?billing=${encodeURIComponent('We could not open the payment page. Please try again.')}`;
    }
  } else {
    next = `${next}?billing=${encodeURIComponent('Online payment is not switched on yet. We will be in touch.')}`;
  }

  const { raw, expires } = await createSession(d.email);
  const res = NextResponse.json({ ok: true, next });
  res.cookies.set(SESSION_COOKIE, raw, sessionCookieOptions(expires));
  return res;
}
