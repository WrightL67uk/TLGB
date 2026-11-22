import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export const runtime = 'nodejs';

function actorFrom(req: NextRequest) {
  const h = req.headers.get('authorization') ?? '';
  try { return atob(h.replace(/^Basic /, '')).split(':')[0] || 'admin'; } catch { return 'admin'; }
}

/** Admin approves (optionally rewording) or removes the "Other" trade or supply category a business typed in. Behind the admin password (middleware). */
export async function POST(req: NextRequest) {
  const fd = await req.formData();
  const id = String(fd.get('id') ?? '');
  const kind = String(fd.get('kind') ?? '');
  const action = String(fd.get('action') ?? '');
  const text = String(fd.get('text') ?? '').trim().slice(0, 120);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !['business', 'supplier'].includes(kind)) return new NextResponse('Bad request', { status: 400 });
  const back = new URL(kind === 'business' ? `/admin/${id}?done=1` : '/admin/resources?done=1', req.url);

  const table = kind === 'business' ? 'businesses' : 'suppliers';
  const col = kind === 'business' ? 'other_trade' : 'other_category';
  if (action === 'approve') {
    if (text.length < 3) return new NextResponse('Enter the wording to show', { status: 400 });
    await db().from(table).update({ [col]: text, [`${col}_ok`]: true }).eq('id', id);
  } else if (action === 'remove') {
    await db().from(table).update({ [col]: null, [`${col}_ok`]: false }).eq('id', id);
  } else return new NextResponse('Bad action', { status: 400 });

  if (kind === 'business') {
    await db().from('review_events').insert({ business_id: id, action: 'note', actor: actorFrom(req), detail: action === 'approve' ? `Other trade approved: ${text}` : 'Other trade removed' });
  }
  return NextResponse.redirect(back, 303);
}
