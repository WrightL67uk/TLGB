import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { emailVideoResult } from '@/lib/email';

export const runtime = 'nodejs';

// Behind the admin login (middleware). Approve a supplier's video, or remove it with a reason.
const back = (req: NextRequest, q = '') => NextResponse.redirect(new URL(`/admin/resources${q}#videos`, req.url), 303);

export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const id = String(fd?.get('id') ?? '');
  const action = String(fd?.get('action') ?? '');
  const reason = String(fd?.get('reason') ?? '').trim();
  if (!fd || !/^[0-9a-f-]{36}$/i.test(id)) return back(req);
  const { data: v } = await db().from('supplier_videos').select('id, storage_path, supplier_id, status').eq('id', id).maybeSingle();
  if (!v) return back(req);
  const { data: s } = await db().from('suppliers').select('name, email').eq('id', v.supplier_id).maybeSingle();
  if (action === 'approve') {
    await db().from('supplier_videos').update({ status: 'approved' }).eq('id', id);
    if (s?.email) await emailVideoResult(s.email, s.name, true, null).catch(() => null);
  } else if (action === 'remove') {
    if (!reason) return back(req, '?supplier_error=' + encodeURIComponent('Give a reason: it goes to the supplier in the email.'));
    await db().storage.from('portfolio').remove([v.storage_path]).then(() => null, () => null);
    await db().from('supplier_videos').delete().eq('id', id);
    if (s?.email) await emailVideoResult(s.email, s.name, false, reason).catch(() => null);
  }
  return back(req);
}
