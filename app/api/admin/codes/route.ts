import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { normaliseCode } from '@/lib/plans';

export const runtime = 'nodejs';

// Behind the admin password (middleware). Create codes and switch them on or off.
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const action = String(fd?.get('action') ?? '');
  const code = normaliseCode(fd?.get('code'));
  const back = (msg: string) => NextResponse.redirect(new URL(`/admin/codes?msg=${encodeURIComponent(msg)}`, req.url), 303);
  if (code.length < 3) return back('Codes need 3 to 20 letters or numbers.');

  if (action === 'on' || action === 'off') {
    await db().from('promo_codes').update({ active: action === 'on' }).eq('code', code);
    return back(`${code} switched ${action}.`);
  }
  if (action !== 'create') return back('Nothing changed.');

  const label = String(fd?.get('label') ?? '').trim().slice(0, 80);
  if (!label) return back('Say where the code is being used.');
  const months = Math.min(24, Math.max(1, Number(fd?.get('pro_months')) || 12));
  const max = Number(fd?.get('max_redemptions')) || null;
  const by = String(fd?.get('redeem_by') ?? '');
  const { error } = await db().from('promo_codes').insert({
    code, label, pro_months: months,
    max_redemptions: max && max > 0 ? Math.floor(max) : null,
    redeem_by: /^\d{4}-\d{2}-\d{2}$/.test(by) ? by : null,
  });
  if (error) return back(error.code === '23505' ? `${code} already exists.` : 'Could not save the code.');
  return back(`${code} created.`);
}
