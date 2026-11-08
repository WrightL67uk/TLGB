import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { cleanCode, pushToStripe, setActiveInStripe, type DiscountCode } from '@/lib/discounts';

export const runtime = 'nodejs';

// Behind the admin password (middleware). Create a code, switch one on or off, or send one to Stripe.
const back = (req: NextRequest, q: string) => NextResponse.redirect(new URL(`/admin/codes?${q}`, req.url), 303);
const msg = (s: string) => 'msg=' + encodeURIComponent(s);
const err = (s: string) => 'error=' + encodeURIComponent(s);

export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  if (!fd) return back(req, err('Nothing was sent.'));
  const action = String(fd.get('action') ?? '');

  if (action === 'create') {
    const code = cleanCode(fd.get('code'));
    const kind = fd.get('kind') === 'amount' ? 'amount' : 'percent';
    const value = Number(fd.get('value'));
    const durationRaw = String(fd.get('duration') ?? 'once');
    const years = Math.max(1, Math.min(10, Math.round(Number(fd.get('years') || 2))));
    const maxUses = Number(fd.get('max_uses') || 0);
    const expires = String(fd.get('expires_on') ?? '');

    if (code.length < 3) return back(req, err('Codes need at least 3 letters or numbers.'));
    if (!(value > 0)) return back(req, err('Enter how much the discount is.'));
    if (kind === 'percent' && value > 100) return back(req, err('A percentage discount cannot be more than 100.'));
    if (expires && !/^\d{4}-\d{2}-\d{2}$/.test(expires)) return back(req, err('The end date is not a valid date.'));

    const duration = durationRaw === 'forever' ? 'forever' : durationRaw === 'years' ? 'repeating' : 'once';
    const { data, error } = await db().from('discount_codes').insert({
      code,
      kind,
      value,
      duration,
      duration_months: duration === 'repeating' ? years * 12 : null,
      max_uses: maxUses > 0 ? Math.round(maxUses) : null,
      expires_on: expires || null,
      first_time_only: fd.get('first_time_only') === 'on',
      note: String(fd.get('note') ?? '').trim().slice(0, 200) || null,
    }).select('*').single();
    if (error || !data) return back(req, err(error?.code === '23505' ? `${code} already exists.` : 'Could not save the code.'));
    try {
      await pushToStripe(data as DiscountCode);
    } catch (e) {
      console.error('discount code to Stripe failed', e);
      return back(req, err(`${code} is saved, but Stripe said: ${(e as Error).message}. Use "Send to Stripe" to try again.`));
    }
    return back(req, msg(`${code} created.`));
  }

  const id = String(fd.get('id') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return back(req, err('Code not found.'));
  const { data: c } = await db().from('discount_codes').select('*').eq('id', id).maybeSingle();
  if (!c) return back(req, err('Code not found.'));

  try {
    if (action === 'off' || action === 'on') {
      const active = action === 'on';
      await setActiveInStripe(c as DiscountCode, active);
      await db().from('discount_codes').update({ active }).eq('id', id);
      return back(req, msg(`${c.code} switched ${active ? 'on' : 'off'}.`));
    }
    if (action === 'stripe') {
      await pushToStripe(c as DiscountCode);
      return back(req, msg(`${c.code} sent to Stripe.`));
    }
  } catch (e) {
    console.error('discount code action failed', e);
    return back(req, err(`Stripe said: ${(e as Error).message}`));
  }
  return back(req, err('Unknown action.'));
}
