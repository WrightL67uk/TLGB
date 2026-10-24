import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { checkCompany } from '@/lib/companiesHouse';
import { cleanUrl } from '@/lib/resources';
import { FREE_MAIL, domainOf } from '@/lib/contractorPlans';
import { emailAdminNewContractor, emailContractorReceived } from '@/lib/email';

export const runtime = 'nodejs';

const Schema = z.object({
  name: z.string().trim().min(2, 'Enter the company name').max(120),
  company_number: z.string().trim().min(6, 'Enter the Companies House number').max(10),
  website: z.string().trim().min(4, 'Enter the company website').max(200),
  user_name: z.string().trim().min(2, 'Enter your name').max(120),
  job_title: z.string().trim().max(80).optional(),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(200),
  phone: z.string().trim().min(7, 'Enter a phone number').max(30),
  terms: z.literal('on', { message: 'Please tick to agree to the terms' }),
});

const back = (req: NextRequest, path: string) => NextResponse.redirect(new URL(path, req.url), 303);
const err = (req: NextRequest, m: string) => back(req, `/contractors/join?error=${encodeURIComponent(m)}`);

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return err(req, 'Please send the form from our website.');
  const fd = await req.formData().catch(() => null);
  if (!fd) return err(req, 'Something went wrong. Please try again.');
  if (fd.get('tlgb_hp_zq')) return back(req, '/contractors/join/thanks'); // bot

  const get = (k: string) => (fd.get(k) == null ? undefined : String(fd.get(k)));
  const parsed = Schema.safeParse({
    name: get('name'), company_number: get('company_number'), website: get('website'), user_name: get('user_name'),
    job_title: get('job_title') || undefined, email: get('email'), phone: get('phone'), terms: get('terms'),
  });
  if (!parsed.success) return err(req, parsed.error.issues[0]?.message ?? 'Please check the form.');
  const d = parsed.data;

  const website = cleanUrl(d.website);
  if (!website) return err(req, 'That website address does not look right.');

  // One role per email: trade listings and contractor accounts stay separate
  const [{ count: asTrade }, { count: asUser }] = await Promise.all([
    db().from('businesses').select('id', { count: 'exact', head: true }).eq('email', d.email).neq('status', 'draft'),
    db().from('contractor_users').select('id', { count: 'exact', head: true }).eq('email', d.email).is('removed_at', null),
  ]);
  if (asTrade) return err(req, 'That email is already used for a trade listing. Please use a different email for your contractor account.');
  if (asUser) return err(req, 'That email already has a contractor account. Log in instead.');

  const ch = await checkCompany(d.company_number);
  if (!ch.ok) return err(req, ch.reason);
  if (!/^active$/i.test(ch.status)) return err(req, `Companies House shows this company as ${ch.status}. Only active companies can join.`);

  const { data: existing } = await db().from('contractor_companies').select('id, status').eq('company_number', ch.companyNumber).neq('status', 'rejected').maybeSingle();
  if (existing) return err(req, 'Your company already has an account. Ask a colleague who uses it to add you from the Team page.');

  const emailDomain = domainOf(d.email)!;
  const siteDomain = domainOf(website);
  const domainNote = FREE_MAIL.test(d.email)
    ? 'Signed up with a personal email address (Gmail or similar). Check they work there.'
    : siteDomain && (emailDomain === siteDomain || emailDomain.endsWith(`.${siteDomain}`) || siteDomain.endsWith(`.${emailDomain}`))
      ? 'Email address matches the company website.'
      : `Email domain (${emailDomain}) does not match the website (${siteDomain ?? 'unknown'}). Check they work there.`;

  const { data: company, error } = await db().from('contractor_companies').insert({
    name: d.name,
    company_number: ch.companyNumber,
    ch_company_name: ch.name,
    ch_status: ch.status,
    ch_registered_address: ch.registeredAddress,
    website,
    email_domain: emailDomain,
    phone: d.phone,
    terms_accepted_at: new Date().toISOString(),
  }).select('id').single();
  if (error || !company) {
    console.error('contractor company insert failed', error);
    return err(req, 'Something went wrong saving your details. Please try again.');
  }
  const { error: uErr } = await db().from('contractor_users').insert({
    company_id: company.id, email: d.email, name: d.user_name, job_title: d.job_title ?? null, role: 'owner', added_by: 'self',
  });
  if (uErr) {
    console.error('contractor user insert failed', uErr);
    await db().from('contractor_companies').delete().eq('id', company.id);
    return err(req, 'Something went wrong saving your details. Please try again.');
  }

  await Promise.all([
    emailAdminNewContractor({ id: company.id, name: d.name, companyNumber: ch.companyNumber, website, userName: d.user_name, email: d.email, domainNote }),
    emailContractorReceived(d.email, d.user_name, d.name),
  ]);
  return back(req, '/contractors/join/thanks');
}
