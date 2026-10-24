import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { RETENTION_BANDS, RETENTION_WANTS } from '@/lib/retentionBan';
import { emailAdminRetentionInterest } from '@/lib/email';

export const runtime = 'nodejs';

const blank = (v: unknown) => (v === '' || v == null ? undefined : v);
const Schema = z.object({
  name: z.string().trim().min(2).max(120),
  business: z.preprocess(blank, z.string().trim().max(160).optional()),
  email: z.string().trim().toLowerCase().email().max(200),
  band: z.preprocess(blank, z.enum(RETENTION_BANDS as [string, ...string[]]).optional()),
  wants: z.array(z.enum(RETENTION_WANTS.map((w) => w.key) as [string, ...string[]])).min(1),
});

const back = (req: NextRequest, q: string) => NextResponse.redirect(new URL(`/guides/retention-ban?${q}#interest`, req.url), 303);

/** Register interest in the retention bond and defects cover scheme. Stored with other service enquiries. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return back(req, 'error=' + encodeURIComponent('Please send the form from our website.'));
  const fd = await req.formData().catch(() => null);
  if (!fd) return back(req, 'error=' + encodeURIComponent('Something went wrong. Please try again.'));
  if (String(fd.get('company_url') ?? '')) return back(req, 'sent=1');
  const parsed = Schema.safeParse({ name: fd.get('name'), business: fd.get('business'), email: fd.get('email'), band: fd.get('band'), wants: fd.getAll('wants').map(String) });
  if (!parsed.success) {
    const wantsMissing = parsed.error.issues.some((i) => i.path[0] === 'wants');
    return back(req, 'error=' + encodeURIComponent(wantsMissing ? 'Tick at least one box.' : 'Please check your name and email address.'));
  }
  const e = parsed.data;
  const { error } = await db().from('service_enquiries').insert({
    service: 'retention', name: e.name, business_name: e.business ?? null, email: e.email,
    schemes: e.wants, message: e.band ? `Retention held: ${e.band}` : null,
  });
  if (error) {
    console.error('retention interest save failed', error);
    return back(req, 'error=' + encodeURIComponent('Something went wrong. Please try again.'));
  }
  await emailAdminRetentionInterest({ name: e.name, business: e.business ?? null, email: e.email, band: e.band ?? null, wants: e.wants.map((k) => RETENTION_WANTS.find((w) => w.key === k)!.label) });
  return back(req, 'sent=1');
}
