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
  const kind = ['pro_free', 'amount_off', 'percent_off'].includes(String(fd?.get('kind'))) ? String(fd?.get('kind')) : 'pro_free';
  const months = Math.min(24, Math.max(1, Number(fd?.get('pro_months')) || 12));
  const amount = Math.floor(Number(fd?.get('amount_off')) || 0);
  const percent = Math.floor(Number(fd?.get('percent_off')) || 0);
  const duration = fd?.get('duration') === 'forever' ? 'forever' : 'once';
  if (kind === 'amount_off' && (amount < 1 || amount > 595)) return back('Enter an amount off between £1 and £595.');
  if (kind === 'percent_off' && (percent < 1 || percent > 100)) return back('Enter a percentage off between 1 and 100.');
  const max = Number(fd?.get('max_redemptions')) || null;
  const by = String(fd?.get('redeem_by') ?? '');
  const { error } = await db().from('promo_codes').insert({
    code, label, kind, pro_months: months, duration,
    amount_off: kind === 'amount_off' ? amount : null,
    percent_off: kind === 'percent_off' ? percent : null,
    max_redemptions: max && max > 0 ? Math.floor(max) : null,
    redeem_by: /^\d{4}-\d{2}-\d{2}$/.test(by) ? by : null,
  });
  if (error) return back(error.code === '23505' ? `${code} already exists.` : 'Could not save the code.');
  return back(`${code} created.`);
}
