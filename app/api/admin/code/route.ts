import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { cleanCode, findCode } from '@/lib/discounts';

export const runtime = 'nodejs';

/** Admin attaches a discount code to a business (or clears it). Behind the admin password (middleware). */
export async function POST(req: NextRequest) {
  const fd = await req.formData();
  const id = String(fd.get('id') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse('Bad request', { status: 400 });
  const back = (q = '') => NextResponse.redirect(new URL(`/admin/${id}${q}`, req.url), 303);
  const raw = cleanCode(fd.get('code'));
  if (!raw) { await db().from('businesses').update({ signup_code: null }).eq('id', id); return back('?done=1'); }
  const found = await findCode(raw);
  if (!found) return new NextResponse(`No such code: ${raw}. Make it on the Codes page first.`, { status: 400 });
  await db().from('businesses').update({ signup_code: found.code.code }).eq('id', id);
  return back('?done=1');
}
