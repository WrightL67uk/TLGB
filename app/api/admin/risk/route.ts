import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { checkBusiness } from '@/lib/riskCheck';

export const runtime = 'nodejs';

/** Admin re-runs the Companies House risk check for one business. Behind the admin password (middleware). */
export async function POST(req: NextRequest) {
  const fd = await req.formData();
  const id = String(fd.get('id') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse('Bad request', { status: 400 });
  const { data: b } = await db().from('businesses').select('company_number, business_type').eq('id', id).maybeSingle();
  if (b?.business_type === 'ltd' && b.company_number) await checkBusiness(id, b.company_number);
  return NextResponse.redirect(new URL(`/admin/${id}`, req.url), 303);
}
