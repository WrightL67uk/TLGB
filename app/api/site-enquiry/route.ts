import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { siteUrl } from '@/lib/config';
import { sameOrigin } from '@/lib/session';
import { loadSiteBySlug, siteAllowed, siteAddress } from '@/lib/memberSites';
import { emailMemberSiteEnquiry, emailAdminSiteEnquiry, emailEnquirerThanks } from '@/lib/email';

export const runtime = 'nodejs';

const blank = (v: unknown) => (v === '' || v == null ? undefined : v);
const Schema = z.object({
  slug: z.string().max(40),
  name: z.string().trim().min(2, 'Please add your name').max(100),
  company: z.preprocess(blank, z.string().trim().max(120).optional()),
  email: z.string().trim().email('Please check your email address').max(200),
  phone: z.preprocess(blank, z.string().trim().max(30).optional()),
  postcode: z.preprocess(blank, z.string().trim().max(10).optional()),
  kind: z.preprocess(blank, z.string().trim().max(60).optional()),
  message: z.string().trim().min(10, 'Please tell us a little about the job').max(4000),
});

/** Enquiry form on a member website. Emails the member, replies go straight to the enquirer. */
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const back = (q: string) => NextResponse.redirect(new URL(`/contact?${q}`, req.url), 303);
  if (!fd) return back('error=' + encodeURIComponent('Something went wrong. Please try again.'));
  if (fd.get('website_url')) return back('sent=1'); // bot filled the hidden box
  if (!sameOrigin(req)) return back('error=' + encodeURIComponent('Please use the form on this website.'));
  const p = Schema.safeParse(Object.fromEntries(['slug', 'name', 'company', 'email', 'phone', 'postcode', 'kind', 'message'].map((k) => [k, fd.get(k)])));
  if (!p.success) return back('error=' + encodeURIComponent(p.error.issues[0]?.message ?? 'Please check the form.'));
  const d = p.data;
  const data = await loadSiteBySlug(d.slug);
  if (!data || data.site.status !== 'live' || !siteAllowed(data.business)) return NextResponse.redirect(siteUrl(), 303);

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();
  const ipHash = ip ? createHash('sha256').update(`site-enquiry:${ip}`).digest('hex') : null;
  if (ipHash) {
    const { count } = await db().from('site_enquiries').select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash).gte('created_at', new Date(Date.now() - 3_600_000).toISOString());
    if ((count ?? 0) >= 5) return back('error=' + encodeURIComponent('Too many enquiries from here in the last hour. Please try again later.'));
  }
  const { error } = await db().from('site_enquiries').insert({
    site_id: data.site.id, business_id: data.business.id, name: d.name, company: d.company ?? null, email: d.email,
    phone: d.phone ?? null, postcode: d.postcode ?? null, kind: d.kind ?? null, message: d.message, ip_hash: ipHash,
  });
  if (error) { console.error('site enquiry save failed', error); return back('error=' + encodeURIComponent('Something went wrong. Please try again.')); }
  await db().rpc('bump_site_counter', { p_site: data.site.id, p_field: 'enquiries' });
  const address = siteAddress(data.site.slug);
  await emailMemberSiteEnquiry(data.business.email, data.business.trading_name, address, {
    name: d.name, company: d.company ?? null, email: d.email, phone: d.phone ?? null, postcode: d.postcode ?? null, kind: d.kind ?? null, message: d.message,
  }, `${siteUrl()}/account/${data.business.id}/website`);
  const mail = { name: d.name, company: d.company ?? null, email: d.email, phone: d.phone ?? null, postcode: d.postcode ?? null, kind: d.kind ?? null, message: d.message };
  await emailEnquirerThanks(d.email, d.name, data.business.trading_name.replace(/\s+(ltd|limited)\.?$/i, ''), data.business.email, data.site.show_phone ? data.business.phone : null, mail);
  await emailAdminSiteEnquiry(data.business.trading_name, address);
  return back('sent=1');
}
