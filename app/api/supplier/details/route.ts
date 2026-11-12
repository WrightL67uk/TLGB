import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { lookupPostcode } from '@/lib/postcodes';
import { SUPPLIER_CATEGORIES, cleanUrl } from '@/lib/resources';
import { DELIVERY_OPTIONS, STANDARDS, isSubscribed, ownedSupplier } from '@/lib/supplierAccount';
import { emailAdminSupplier } from '@/lib/email';

export const runtime = 'nodejs';

const cats = SUPPLIER_CATEGORIES.map((c) => c.key) as [string, ...string[]];
const blank = (v: unknown) => (v === '' || v == null ? undefined : v);
const Body = z.object({
  supplierId: z.string(),
  submit: z.boolean().optional(),
  contact_name: z.string().trim().min(2, 'Enter your name').max(80),
  phone: z.string().trim().min(6, 'Enter a phone number').max(30),
  public_email: z.preprocess(blank, z.string().trim().toLowerCase().email('The public email address does not look right').max(200).optional()),
  website: z.preprocess(blank, z.string().trim().max(200).optional()),
  address: z.preprocess(blank, z.string().trim().max(200).optional()),
  town: z.string().trim().min(2, 'Enter your town').max(80),
  postcode: z.string().trim().min(2, 'Enter the postcode of your yard or depot').max(10),
  delivers_nationally: z.boolean(),
  categories: z.array(z.enum(cats)).min(1, 'Pick at least one thing you supply'),
  description: z.string().trim().min(10, 'Add a one or two sentence summary').max(400, 'Keep the summary under 400 characters'),
  about: z.preprocess(blank, z.string().trim().max(2000, 'About us is too long (2,000 characters at most)').optional()),
  year_established: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().int().min(1800).max(new Date().getFullYear()).optional()),
  delivery_options: z.array(z.enum(DELIVERY_OPTIONS.map((d) => d.key) as [string, ...string[]])),
  min_order: z.preprocess(blank, z.string().trim().max(120).optional()),
  trade_accounts: z.boolean(),
  trade_only: z.boolean(),
  standards: z.array(z.enum(STANDARDS.map((d) => d.key) as [string, ...string[]])),
  standards_other: z.preprocess(blank, z.string().trim().max(200).optional()),
  product_liability: z.boolean().nullable(),
  captions: z.record(z.string(), z.string().trim().max(120)).optional(),
});

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail('Request blocked.', 403);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const d = parsed.data;
  const own = await ownedSupplier(d.supplierId);
  if (!own.ok) return fail(own.error, own.status);
  const s = own.supplier;
  if (s.status === 'rejected') return fail('This application was not approved. Contact us if you would like to talk it through.', 403);

  const website = d.website ? cleanUrl(d.website) : null;
  if (d.website && !website) return fail('That website address does not look right.');
  const pc = await lookupPostcode(d.postcode);
  if (!pc.ok) return fail(pc.reason);

  const submitting = !!d.submit && s.status === 'started';
  if (submitting) {
    if (!isSubscribed(s)) return fail('Please complete payment first, then send your details.');
    if ((d.about ?? '').length < 40) return fail('Tell buyers a bit about your company in "About us" (a few sentences).');
    const { count } = await db().from('supplier_photos').select('id', { count: 'exact', head: true }).eq('supplier_id', s.id);
    if (!count) return fail('Add at least one picture of your products or premises. Your profile page needs something to show.');
  }

  const { error } = await db().from('suppliers').update({
    contact_name: d.contact_name, phone: d.phone, public_email: d.public_email ?? null, website, address: d.address ?? null,
    town: d.town, postcode: pc.postcode, lat: pc.lat, lng: pc.lng, delivers_nationally: d.delivers_nationally,
    categories: d.categories, description: d.description, about: d.about ?? null, year_established: d.year_established ?? null,
    delivery_options: d.delivery_options, min_order: d.min_order ?? null, trade_accounts: d.trade_accounts, trade_only: d.trade_only,
    standards: d.standards, standards_other: d.standards_other ?? null, product_liability: d.product_liability,
    ...(submitting ? { status: 'pending', submitted_at: new Date().toISOString() } : {}),
  }).eq('id', s.id);
  if (error) {
    console.error('supplier details save failed', error);
    return fail('Something went wrong saving. Please try again.', 500);
  }
  for (const [id, caption] of Object.entries(d.captions ?? {})) {
    if (/^[0-9a-f-]{36}$/i.test(id)) await db().from('supplier_photos').update({ caption: caption || null }).eq('id', id).eq('supplier_id', s.id);
  }
  if (submitting) {
    await emailAdminSupplier(`Supplier waiting for approval: ${s.name}`, `${s.name} has paid for ${s.tier === 'match' ? 'Match' : 'Appear'} and sent their details to be checked.`, s.id).catch(() => null);
  }
  return NextResponse.json({ ok: true, submitted: submitting });
}
