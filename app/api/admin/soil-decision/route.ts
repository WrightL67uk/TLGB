import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { emailSoilResult } from '@/lib/email';

export const runtime = 'nodejs';

// Behind the admin login (middleware). Approve or turn down a supplier's soil details and test certificates.
const back = (req: NextRequest, q = '') => NextResponse.redirect(new URL(`/admin/resources${q}#soil`, req.url), 303);

export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const id = String(fd?.get('id') ?? '');
  const action = String(fd?.get('action') ?? '');
  const reason = String(fd?.get('reason') ?? '').trim();
  if (!fd || !/^[0-9a-f-]{36}$/i.test(id)) return back(req);
  const { data: s } = await db().from('suppliers').select('id, name, email, soil_status').eq('id', id).maybeSingle();
  if (!s) return back(req);
  const now = new Date().toISOString();
  if (action === 'approve') {
    if (s.soil_status !== 'pending') return back(req, '?supplier_error=' + encodeURIComponent('Only soil details waiting for a check can be approved.'));
    await db().from('suppliers').update({ soil_status: 'approved', soil_checked_at: now, soil_note: null }).eq('id', id);
    if (s.email) await emailSoilResult(s.email, s.name, true, null).catch(() => null);
  } else if (action === 'reject' || action === 'withdraw') {
    if (!reason) return back(req, '?supplier_error=' + encodeURIComponent('Give a reason: it goes to the supplier in the email.'));
    await db().from('suppliers').update({ soil_status: 'rejected', soil_checked_at: now, soil_note: reason }).eq('id', id);
    if (s.email) await emailSoilResult(s.email, s.name, false, reason).catch(() => null);
  }
  return back(req);
}
