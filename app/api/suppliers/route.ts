import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { lookupPostcode } from '@/lib/postcodes';
import { emailAdminSupplierSubmission } from '@/lib/email';
import { SUPPLIER_CATEGORIES, cleanUrl } from '@/lib/resources';

export const runtime = 'nodejs';

const keys = SUPPLIER_CATEGORIES.map((c) => c.key) as [string, ...string[]];
const blank = (v: unknown) => (v === '' || v == null ? undefined : v);
const Schema = z.object({
  name: z.string().trim().min(2).max(160),
  categories: z.array(z.enum(keys)).min(1, 'Pick at least one thing you supply'),
  description: z.string().trim().min(10, 'Add a short description').max(400),
  website: z.preprocess(blank, z.string().trim().max(200).optional()),
  phone: z.preprocess(blank, z.string().trim().max(30).optional()),
  town: z.preprocess(blank, z.string().trim().max(80).optional()),
  postcode: z.preprocess(blank, z.string().trim().max(10).optional()),
  email: z.string().trim().toLowerCase().email().max(200),
});

const back = (req: NextRequest, q: string) => NextResponse.redirect(new URL(`/suppliers/add?${q}`, req.url), 303);

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return back(req, 'error=' + encodeURIComponent('Please send the form from our website.'));
  const fd = await req.formData().catch(() => null);
  if (!fd) return back(req, 'error=' + encodeURIComponent('Something went wrong. Please try again.'));
  if (String(fd.get('company_url') ?? '')) return back(req, 'sent=1');
  const parsed = Schema.safeParse({
    name: fd.get('name'), categories: fd.getAll('categories').map(String), description: fd.get('description'),
    website: fd.get('website'), phone: fd.get('phone'), town: fd.get('town'), postcode: fd.get('postcode'), email: fd.get('email'),
  });
  if (!parsed.success) return back(req, 'error=' + encodeURIComponent(parsed.error.issues[0]?.message ?? 'Please check the form.'));
  const s = parsed.data;
  const website = s.website ? cleanUrl(s.website) : null;
  if (s.website && !website) return back(req, 'error=' + encodeURIComponent('That website address does not look right.'));
  let pos: { postcode: string | null; lat: number | null; lng: number | null } = { postcode: null, lat: null, lng: null };
  if (s.postcode) {
    const pc = await lookupPostcode(s.postcode);
    if (!pc.ok) return back(req, 'error=' + encodeURIComponent(pc.reason));
    pos = { postcode: pc.postcode, lat: pc.lat, lng: pc.lng };
  }
  const { error } = await db().from('suppliers').insert({
    status: 'pending', name: s.name, categories: s.categories, description: s.description, website,
    phone: s.phone ?? null, town: s.town ?? null, ...pos, delivers_nationally: fd.get('delivers_nationally') === '1',
    email: s.email, submitted_by: s.email,
  });
  if (error) {
    console.error('supplier save failed', error);
    return back(req, 'error=' + encodeURIComponent('Something went wrong. Please try again.'));
  }
  await emailAdminSupplierSubmission(s.name, website, s.email);
  return back(req, 'sent=1');
}
