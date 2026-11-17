import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { checkCompany } from '@/lib/companiesHouse';
import { cleanUrl } from '@/lib/resources';
import { FREE_MAIL, domainOf } from '@/lib/contractorPlans';
import { tooMany, visitor, TOO_MANY } from '@/lib/rateLimit';
import { LEVELS } from '@/lib/seekerTypes';
import { PLACEMENT_TYPES, AGENCY_BODIES, newReferralCode } from '@/lib/agencies';
import { createSession, sessionCookieOptions, SESSION_COOKIE } from '@/lib/session';
import { checkPassword, passwordProblem, setPassword } from '@/lib/passwords';
import { agencyCheckoutUrl } from '@/lib/agencyCheckout';
import { emailAdminNewAgency, emailAgencyReceived } from '@/lib/email';

export const runtime = 'nodejs';

const date = (msg: string) => z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, msg);
const Schema = z.object({
  name: z.string().trim().min(2, 'Enter the agency name').max(120),
  company_number: z.string().trim().min(6, 'Enter the Companies House number').max(10),
  website: z.string().trim().min(4, 'Enter the agency website').max(200),
  contact_name: z.string().trim().min(2, 'Enter your name').max(120),
  job_title: z.string().trim().max(80).optional(),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(200),
  phone: z.string().trim().min(7, 'Enter a phone number').max(30),
  roles: z.array(z.enum(LEVELS.map((o) => o.key) as [string, ...string[]])).min(1, 'Tick at least one type of role you place'),
  placement_types: z.array(z.enum(PLACEMENT_TYPES.map((o) => o.key) as [string, ...string[]])).min(1, 'Say whether you place temporary, permanent or both'),
  covers: z.string().trim().min(2, 'Say which areas you cover').max(300),
  el_expiry: date('Enter the date your employers liability insurance runs to'),
  pl_expiry: date('Enter the date your public liability insurance runs to'),
  memberships: z.array(z.enum(AGENCY_BODIES.map((o) => o.key) as [string, ...string[]])),
  glaa_licence: z.string().trim().max(40).optional(),
  rtw: z.literal('on', { message: 'Please tick to confirm you carry out right to work checks' }),
  terms: z.literal('on', { message: 'Please tick to agree to the terms' }),
  password: z.string(),
  password2: z.string(),
});

const back = (req: NextRequest, path: string) =>
  req.headers.get('x-tlgb-fetch') ? NextResponse.json({ redirect: path }) : NextResponse.redirect(new URL(path, req.url), 303);
const err = (req: NextRequest, m: string) => back(req, `/agencies/join?error=${encodeURIComponent(m)}`);

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return err(req, 'Please send the form from our website.');
  if (await tooMany('agency-join', visitor(req), 10, 60)) return err(req, TOO_MANY);
  const fd = await req.formData().catch(() => null);
  if (!fd) return err(req, 'Something went wrong. Please try again.');
  if (fd.get('tlgb_hp_zq')) return back(req, '/agencies/join/thanks'); // bot

  const get = (k: string) => (fd.get(k) == null ? undefined : String(fd.get(k)));
  const parsed = Schema.safeParse({
    name: get('name'), company_number: get('company_number'), website: get('website'), contact_name: get('contact_name'),
    job_title: get('job_title') || undefined, email: get('email'), phone: get('phone'),
    roles: fd.getAll('roles').map(String), placement_types: fd.getAll('placement_types').map(String), covers: get('covers'),
    el_expiry: get('el_expiry'), pl_expiry: get('pl_expiry'), memberships: fd.getAll('memberships').map(String),
    glaa_licence: get('glaa_licence') || undefined, rtw: get('rtw'), terms: get('terms'),
    password: get('password') ?? '', password2: get('password2') ?? '',
  });
  if (!parsed.success) return err(req, parsed.error.issues[0]?.message ?? 'Please check the form.');
  const d = parsed.data;
  const pwProblem = passwordProblem(d.password);
  if (pwProblem) return err(req, `Password: ${pwProblem}`);
  if (d.password !== d.password2) return err(req, 'The two passwords do not match.');

  const today = new Date().toISOString().slice(0, 10);
  if (d.el_expiry < today || d.pl_expiry < today) return err(req, 'Your insurance must be in date. Check the expiry dates.');
  const website = cleanUrl(d.website);
  if (!website) return err(req, 'That website address does not look right.');

  // One role per email, so nobody ends up with two kinds of account
  const [b, c, s, j] = await Promise.all([
    db().from('businesses').select('id', { count: 'exact', head: true }).eq('email', d.email).neq('status', 'draft'),
    db().from('contractor_users').select('id', { count: 'exact', head: true }).eq('email', d.email).is('removed_at', null),
    db().from('suppliers').select('id', { count: 'exact', head: true }).eq('email', d.email).neq('status', 'rejected'),
    db().from('job_seekers').select('id', { count: 'exact', head: true }).eq('email', d.email).neq('status', 'removed'),
  ]);
  if ((b.count ?? 0) + (c.count ?? 0) + (s.count ?? 0) + (j.count ?? 0) > 0) return err(req, 'That email is already used for another kind of account. Please use a different work email for your agency.');
  const { count: mine } = await db().from('agencies').select('id', { count: 'exact', head: true }).eq('email', d.email).neq('status', 'rejected');
  if (mine) {
    // Came back after submitting (Back button, wrong detail, closed the payment page) and has not paid yet:
    // same email and password carries on to payment with the corrected details.
    const { data: resume } = await db().from('agencies').select('id, name, email, stripe_customer_id').eq('email', d.email).eq('status', 'pending').eq('subscription_status', 'none').maybeSingle();
    if (resume && (await checkPassword(d.email, d.password, visitor(req)))) {
      await db().from('agencies').update({ phone: d.phone, contact_name: d.contact_name, job_title: d.job_title ?? null, covers: d.covers, el_expiry: d.el_expiry, pl_expiry: d.pl_expiry }).eq('id', resume.id);
      const { raw, expires } = await createSession(d.email);
      const go = (res: NextResponse) => { res.cookies.set(SESSION_COOKIE, raw, sessionCookieOptions(expires)); return res; };
      try {
        const url = await agencyCheckoutUrl(resume, '/agencies/join/thanks?unpaid=1');
        if (url) return go(req.headers.get('x-tlgb-fetch') ? NextResponse.json({ redirect: url }) : NextResponse.redirect(url, 303));
      } catch (e) { console.error('agency resume checkout failed', e); }
      return go(back(req, '/agencies/join/thanks?unpaid=1') as NextResponse);
    }
    return err(req, 'That email already has an agency account. If you started signing up earlier, type the same password you chose then to carry on. Otherwise log in.');
  }

  const ch = await checkCompany(d.company_number);
  if (!ch.ok) return err(req, ch.reason);
  if (!/^active$/i.test(ch.status)) return err(req, `Companies House shows this company as ${ch.status}. Only active companies can join.`);
  const { data: existing } = await db().from('agencies').select('id').eq('company_number', ch.companyNumber).in('status', ['pending', 'approved', 'suspended']).maybeSingle();
  if (existing) return err(req, 'Your agency already has an account. Ask a colleague who uses it, or contact admin@tlgb.co.uk.');

  const emailDomain = domainOf(d.email)!;
  const siteDomain = domainOf(website);
  const domainNote = FREE_MAIL.test(d.email)
    ? 'Signed up with a personal email address (Gmail or similar). Check they work there.'
    : siteDomain && (emailDomain === siteDomain || emailDomain.endsWith(`.${siteDomain}`) || siteDomain.endsWith(`.${emailDomain}`))
      ? 'Email address matches the agency website.'
      : `Email domain (${emailDomain}) does not match the website (${siteDomain ?? 'unknown'}). Check they work there.`;

  const { data: agency, error } = await db().from('agencies').insert({
    name: d.name, company_number: ch.companyNumber, ch_company_name: ch.name, ch_status: ch.status, ch_registered_address: ch.registeredAddress,
    website, email_domain: emailDomain, phone: d.phone, email: d.email, contact_name: d.contact_name, job_title: d.job_title ?? null,
    roles: d.roles, placement_types: d.placement_types, covers: d.covers, el_expiry: d.el_expiry, pl_expiry: d.pl_expiry,
    memberships: d.memberships, glaa_licence: d.glaa_licence ?? null, rtw_confirmed: true,
    terms_accepted_at: new Date().toISOString(), referral_code: newReferralCode(),
  }).select('id').single();
  if (error || !agency) {
    console.error('agency insert failed', error);
    return err(req, 'Something went wrong saving your details. Please try again.');
  }

  const pwSet = await setPassword(d.email, d.password);
  if (pwSet.error) console.error('agency password failed', pwSet.error);
  const { raw, expires } = await createSession(d.email);
  const withSession = (res: NextResponse) => { res.cookies.set(SESSION_COOKIE, raw, sessionCookieOptions(expires)); return res; };

  await Promise.all([
    emailAdminNewAgency({ id: agency.id, name: d.name, companyNumber: ch.companyNumber, website, contact: d.contact_name, email: d.email, domainNote }),
    emailAgencyReceived(d.email, d.contact_name, d.name),
  ]);
  // Straight on to the payment page. We approve once they have paid.
  try {
    const url = await agencyCheckoutUrl({ id: agency.id, name: d.name, email: d.email, stripe_customer_id: null }, '/agencies/join/thanks?unpaid=1');
    if (url) return withSession(req.headers.get('x-tlgb-fetch') ? NextResponse.json({ redirect: url }) : NextResponse.redirect(url, 303));
  } catch (e) {
    console.error('agency checkout at sign-up failed', e);
  }
  return withSession(back(req, '/agencies/join/thanks?unpaid=1') as NextResponse);
}
