import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';

export const runtime = 'nodejs';

// Behind the admin login (middleware). Changes the name shown for a trade (trading_name) or a supplier (name).
// The Companies House name and the supplier's page address are left alone.
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const back = (qs: string, f = '/admin') => NextResponse.redirect(new URL(`${f}?${qs}`, req.url), 303);
  if (!fd || !sameOrigin(req)) return back('error=Please+use+the+form');
  const rawFrom = String(fd.get('from') ?? '');
  const dest = /^\/admin[\w\-/]*$/.test(rawFrom) ? rawFrom : '/admin';
  const kind = String(fd.get('kind') ?? '');
  const id = String(fd.get('id') ?? '');
  const name = String(fd.get('name') ?? '').replace(/\s+/g, ' ').trim();
  if (!/^[0-9a-f-]{36}$/.test(id) || (kind !== 'business' && kind !== 'supplier')) return back('error=Not+found', dest);
  if (name.length < 2 || name.length > 120) return back('rename_error=Name+must+be+2+to+120+characters', dest);

  if (kind === 'business') {
    const { error } = await db().from('businesses').update({ trading_name: name }).eq('id', id);
    if (error) return back('rename_error=Could+not+save+the+name', dest);
    await db().from('review_events').insert({ business_id: id, action: 'changed', actor: 'admin', detail: `Name changed to ${name}` }).then(() => null, () => null);
  } else {
    const { error } = await db().from('suppliers').update({ name }).eq('id', id);
    if (error) return back('rename_error=Could+not+save+the+name', dest);
  }
  return back('renamed=1', dest);
}
