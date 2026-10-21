import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { emailAccreditationEnquiry } from '@/lib/email';

export const runtime = 'nodejs';

const blank = (v: unknown) => (v === '' || v == null ? undefined : v);
const Schema = z.object({
  name: z.string().trim().min(2).max(120),
  business: z.preprocess(blank, z.string().trim().max(160).optional()),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.preprocess(blank, z.string().trim().max(30).optional()),
  schemes: z.array(z.string().trim().max(60)).max(10),
  message: z.preprocess(blank, z.string().trim().max(2000).optional()),
});

const back = (req: NextRequest, q: string) => NextResponse.redirect(new URL(`/accreditation-help?${q}`, req.url), 303);

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return back(req, 'error=' + encodeURIComponent('Please send the form from our website.'));
  const fd = await req.formData().catch(() => null);
  if (!fd) return back(req, 'error=' + encodeURIComponent('Something went wrong. Please try again.'));
  // Bots fill every field; people never see this one
  if (String(fd.get('company_url') ?? '')) return back(req, 'sent=1');
  const parsed = Schema.safeParse({
    name: fd.get('name'), business: fd.get('business'), email: fd.get('email'), phone: fd.get('phone'),
    schemes: fd.getAll('schemes').map(String), message: fd.get('message'),
  });
  if (!parsed.success) return back(req, 'error=' + encodeURIComponent('Please check your name and email address.'));
  const e = parsed.data;
  const { error } = await db().from('service_enquiries').insert({
    service: 'accreditation', name: e.name, business_name: e.business ?? null, email: e.email,
    phone: e.phone ?? null, schemes: e.schemes, message: e.message ?? null,
  });
  if (error) {
    console.error('enquiry save failed', error);
    return back(req, 'error=' + encodeURIComponent('Something went wrong. Please try again.'));
  }
  await emailAccreditationEnquiry({ ...e, business: e.business ?? null, phone: e.phone ?? null, message: e.message ?? null });
  return back(req, 'sent=1');
}
