import { cleanAccreditationExpiries } from '@/lib/expiries';
import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { checkCompany } from '@/lib/companiesHouse';
import { lookupPostcode } from '@/lib/postcodes';
import {
  ACCREDITATIONS, TRADES, TURNOVER_BANDS, DOC_MIME, PHOTO_MIME, MAX_FILE_BYTES, MAX_PHOTOS,
} from '@/lib/config';

// Step 1 of 2: validate the form, save a draft and hand back signed upload
// URLs. The browser uploads files straight to Supabase Storage (keeps us under
// Vercel's ~4.5MB request limit), then calls /api/apply/complete.

export const runtime = 'nodejs';

const tradeSlugs = TRADES.map((t) => t.slug) as [string, ...string[]];
const bandKeys = TURNOVER_BANDS.map((b) => b.key) as [string, ...string[]];
const blankToUndef = (v: unknown) => (v === '' || v == null ? undefined : v);

const FileMeta = z.object({
  field: z.enum(['letterhead', 'pl_certificate', 'el_certificate', 'accreditation_docs', 'photos']),
  name: z.string().min(1).max(200),
  type: z.string(),
  size: z.number().int().positive().max(MAX_FILE_BYTES, 'Each file must be under 10MB'),
});

const Base = z.object({
  trading_name: z.string().trim().min(2).max(120),
  contact_name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().min(7).max(30),
  website: z.preprocess(blankToUndef, z.string().trim().max(200).optional()),
  business_address: z.preprocess(blankToUndef, z.string().trim().max(300).optional()),
  description: z.preprocess(blankToUndef, z.string().trim().max(2000).optional()),
  base_postcode: z.string().trim().min(5).max(10),
  radius_miles: z.coerce.number().int().min(5).max(300),
  trades: z.array(z.enum(tradeSlugs)).min(1, 'Pick at least one trade'),
  accreditations: z.array(z.enum(ACCREDITATIONS)).default([]),
  accreditation_expiries: z.record(z.string(), z.string()).default({}),
  turnover_band: z.enum(bandKeys, { message: 'Choose your annual turnover' }),
  pl_cover_amount: z.coerce.number().int().positive(),
  pl_expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter the policy expiry date'),
  el_cover_amount: z.preprocess(blankToUndef, z.coerce.number().int().positive().optional()),
  el_expiry: z.preprocess(blankToUndef, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  declaration: z.literal(true, { message: 'You must confirm the declaration' }),
  files: z.array(FileMeta).max(20),
  hp_check: z.string().optional(), // honeypot
});

const Schema = z.discriminatedUnion('business_type', [
  Base.extend({ business_type: z.literal('ltd'), company_number: z.string({ message: 'Enter your company number' }).trim().min(6).max(10) }),
  Base.extend({ business_type: z.literal('sole_trader'), owner_full_name: z.string({ message: 'Enter your full name' }).trim().min(2).max(120) }),
]);

const DOC_TYPE: Record<string, string> = {
  letterhead: 'letterhead',
  pl_certificate: 'public_liability',
  el_certificate: 'employers_liability',
  accreditation_docs: 'accreditation',
};

const LABEL: Record<string, string> = {
  business_type: 'Business type', company_number: 'Company number', owner_full_name: 'Owner name',
  trading_name: 'Trading name', contact_name: 'Contact name', email: 'Email', phone: 'Phone',
  base_postcode: 'Base postcode', radius_miles: 'Coverage radius', trades: 'Trades',
  turnover_band: 'Turnover',
  pl_cover_amount: 'Public liability cover', pl_expiry: 'Public liability expiry',
  declaration: 'Declaration', files: 'Files',
};

function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

const ext = (name: string) => (name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return fail('Could not read the form. Please try again.');
  if (body.hp_check) { console.warn('honeypot hit', { email: body.email, name: body.trading_name }); return NextResponse.json({ ok: true, id: null, uploads: [] }); } // bot

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const key = String(issue.path[0] ?? '');
    return fail(`${LABEL[key] ?? key ?? 'Form'}: ${issue.message}`);
  }
  const d = parsed.data;

  // ---- File rules
  const by = (f: string) => d.files.filter((x) => x.field === f);
  if (d.business_type === 'sole_trader' && by('letterhead').length === 0)
    return fail('Sole traders must upload a copy of their letterhead.');
  if (by('pl_certificate').length === 0) return fail('Please upload your public liability insurance certificate.');
  if (by('photos').length > MAX_PHOTOS) return fail(`Up to ${MAX_PHOTOS} photos please.`);
  for (const f of d.files) {
    const allowed = f.field === 'photos' ? PHOTO_MIME : DOC_MIME;
    if (!allowed.includes(f.type))
      return fail(`${f.name}: ${f.field === 'photos' ? 'photos must be JPG, PNG or WebP' : 'documents must be PDF, JPG or PNG'}.`);
  }

  const today = new Date().toISOString().slice(0, 10);
  if (d.pl_expiry < today) return fail('Your public liability insurance has expired. Upload a current certificate.');
  const accExp = cleanAccreditationExpiries(d.accreditations, d.accreditation_expiries);
  if (!accExp.ok) return fail(accExp.error);

  // ---- One role per email: contractor accounts and trade listings stay separate
  const { count: asContractor } = await db().from('contractor_users').select('id', { count: 'exact', head: true }).eq('email', d.email).is('removed_at', null);
  if (asContractor) return fail('That email is used for a main contractor account. Please use a different email for your listing.');

  // ---- Postcode
  const pc = await lookupPostcode(d.base_postcode);
  if (!pc.ok) return fail(pc.reason);

  // ---- Companies House (always re-checked server side, never trust the browser)
  let ch: Extract<Awaited<ReturnType<typeof checkCompany>>, { ok: true }> | null = null;
  if (d.business_type === 'ltd') {
    const res = await checkCompany(d.company_number);
    if (!res.ok) return fail(res.reason);
    ch = res;
    const { count } = await db()
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .eq('company_number', ch.companyNumber)
      .not('status', 'in', '(rejected,draft)');
    if (count && count > 0) return fail('This company is already listed or has an application in progress.');
  }

  // ---- Save draft
  const uploadToken = randomBytes(24).toString('hex');
  const { data: biz, error } = await db()
    .from('businesses')
    .insert({
      status: 'draft',
      upload_token: createHash('sha256').update(uploadToken).digest('hex'),
      business_type: d.business_type,
      company_number: ch?.companyNumber ?? null,
      ch_company_name: ch?.name ?? null,
      ch_status: ch?.status ?? null,
      ch_incorporated_on: ch?.incorporatedOn ?? null,
      ch_registered_address: ch?.registeredAddress ?? null,
      ch_raw: ch?.raw ?? null,
      owner_full_name: d.business_type === 'sole_trader' ? d.owner_full_name : null,
      trading_name: d.trading_name,
      contact_name: d.contact_name,
      email: d.email,
      phone: d.phone,
      website: d.website ?? null,
      business_address: d.business_address ?? null,
      description: d.description ?? null,
      base_postcode: pc.postcode,
      lat: pc.lat,
      lng: pc.lng,
      radius_miles: d.radius_miles,
      trades: d.trades,
      accreditations: d.accreditations,
      accreditation_expiries: accExp.value,
      turnover_band: d.turnover_band,
      pl_cover_amount: d.pl_cover_amount,
      pl_expiry: d.pl_expiry,
      el_cover_amount: d.el_cover_amount ?? null,
      el_expiry: d.el_expiry ?? null,
    })
    .select('id')
    .single();

  if (error || !biz) {
    console.error('insert business failed', error);
    return fail('Something went wrong saving your application. Please try again.', 500);
  }
  const id = biz.id as string;

  // ---- Signed upload URLs + expected file rows
  const uploads: { index: number; bucket: string; path: string; signedUrl: string }[] = [];
  try {
    let photoOrder = 0;
    for (const [index, f] of d.files.entries()) {
      const isPhoto = f.field === 'photos';
      const bucket = isPhoto ? 'portfolio' : 'documents';
      const path = isPhoto
        ? `${id}/${crypto.randomUUID()}.${ext(f.name)}`
        : `${id}/${DOC_TYPE[f.field]}-${crypto.randomUUID()}.${ext(f.name)}`;

      const signed = await db().storage.from(bucket).createSignedUploadUrl(path);
      if (signed.error) throw signed.error;
      uploads.push({ index, bucket, path, signedUrl: signed.data.signedUrl });

      const ins = isPhoto
        ? await db().from('business_photos').insert({ business_id: id, storage_path: path, sort_order: photoOrder++ })
        : await db().from('business_documents').insert({
            business_id: id, doc_type: DOC_TYPE[f.field], storage_path: path,
            file_name: f.name, mime_type: f.type, size_bytes: f.size,
          });
      if (ins.error) throw ins.error;
    }
  } catch (err) {
    console.error('prepare uploads failed', err);
    await db().from('businesses').delete().eq('id', id);
    return fail('Could not prepare your uploads. Please try again.', 500);
  }

  return NextResponse.json({ ok: true, id, uploadToken, uploads });
}
