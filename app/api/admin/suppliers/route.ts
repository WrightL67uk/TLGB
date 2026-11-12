import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export const runtime = 'nodejs';

// Behind the admin password (middleware). Sets a supplier's email and whether they get estimate requests.
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const id = String(fd?.get('id') ?? '');
  const back = (q = '') => NextResponse.redirect(new URL(`/admin/resources${q}#price-requests`, req.url), 303);
  if (!fd || !/^[0-9a-f-]{36}$/i.test(id)) return back();
  const plan = String(fd.get('plan') ?? 'off');
  const email = String(fd.get('email') ?? '').trim().toLowerCase();
  const until = String(fd.get('paid_until') ?? '');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return back('?supplier_error=' + encodeURIComponent('That email address does not look right.'));
  if (plan !== 'off' && !email) return back('?supplier_error=' + encodeURIComponent('Add an email address before switching on estimate requests.'));
  if (plan === 'paid' && !/^\d{4}-\d{2}-\d{2}$/.test(until)) return back('?supplier_error=' + encodeURIComponent('Add a "paid until" date for a paid supplier.'));
  const { error } = await db().from('suppliers').update({
    email: email || null,
    quote_requests: plan !== 'off',
    quote_plan: plan === 'off' ? null : plan,
    quote_paid_until: plan === 'paid' ? until : null,
  }).eq('id', id);
  if (error) console.error('admin supplier update failed', error);
  return back();
}
