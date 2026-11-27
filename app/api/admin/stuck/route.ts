import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export const runtime = 'nodejs';

/** Admin marks an "I'm stuck" request handled (reminders to them resume). Behind the admin password. */
export async function POST(req: NextRequest) {
  const fd = await req.formData();
  const id = String(fd.get('id') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse('Bad request', { status: 400 });
  await db().from('businesses').update({ stuck_handled_at: new Date().toISOString(), stuck_at: null }).eq('id', id);
  return NextResponse.redirect(new URL(String(fd.get('back') ?? `/admin/${id}`), req.url), 303);
}
