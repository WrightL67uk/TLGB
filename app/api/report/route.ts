import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { tooMany, visitor, TOO_MANY } from '@/lib/rateLimit';
import { REPORT_REASONS, reasonLabel } from '@/lib/report';
import { emailReport } from '@/lib/email';

export const runtime = 'nodejs';

const Schema = z.object({
  kind: z.enum(['trade', 'supplier']),
  id: z.string().regex(/^[0-9a-f-]{36}$/i),
  reason: z.enum(REPORT_REASONS.map((r) => r.key) as [string, ...string[]]),
  message: z.string().trim().min(10).max(3000),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
});

const fail = (msg: string) => NextResponse.json({ ok: false, error: msg }, { status: 400 });

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail('Please send the form from our website.');
  const fd = await req.formData().catch(() => null);
  if (!fd) return fail('Something went wrong. Please try again.');
  if (String(fd.get('company_url') ?? '')) return NextResponse.json({ ok: true });
  const parsed = Schema.safeParse({ kind: fd.get('kind'), id: fd.get('id'), reason: fd.get('reason'), message: fd.get('message'), name: fd.get('name'), email: fd.get('email') });
  if (!parsed.success) {
    const paths = parsed.error.issues.map((i) => i.path[0]);
    return fail(paths.includes('message') ? 'Please tell us a little more about what happened.' : paths.includes('email') ? 'Please check your email address.' : paths.includes('name') ? 'Please check your name.' : 'Please check the form and try again.');
  }
  if (await tooMany('report', visitor(req), 5, 60)) return fail(TOO_MANY);
  const r = parsed.data;

  const table = r.kind === 'trade' ? 'businesses' : 'suppliers';
  const col = r.kind === 'trade' ? 'trading_name' : 'name';
  const { data: target } = await db().from(table).select(`id, ${col}`).eq('id', r.id).maybeSingle();
  if (!target) return fail('We could not find that business.');
  const businessName = String((target as unknown as Record<string, unknown>)[col] ?? '');
  const adminLink = r.kind === 'trade' ? `/admin/${r.id}` : '/admin/resources';

  const { error } = await db().from('service_enquiries').insert({
    service: 'report', name: r.name, business_name: businessName, email: r.email,
    schemes: [reasonLabel(r.reason)], message: `${r.message}\n\n(Report about ${businessName}, ${r.kind}. Admin: ${adminLink})`,
  });
  if (error) console.error('report save failed', error);

  await emailReport({ business: businessName, kind: r.kind, reason: reasonLabel(r.reason), name: r.name, email: r.email, message: r.message, adminLink });
  return NextResponse.json({ ok: true });
}
