import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { ownedBusiness } from '@/lib/account';
import { sameOrigin } from '@/lib/session';
import { tooMany, visitor } from '@/lib/rateLimit';
import { cleanCode, findCode, usable, describe } from '@/lib/discounts';

export const runtime = 'nodejs';

/** A member enters a discount or founding code on the plan page. Saved to the business, applied when they start the trial. */
export async function POST(req: NextRequest) {
  const fd = await req.formData();
  const id = String(fd.get('id') ?? '');
  const back = (q: string) => NextResponse.redirect(new URL(`/account/${id}/plan?${q}`, req.url), 303);
  if (!sameOrigin(req)) return back('billing=' + encodeURIComponent('Please use the form on this website.'));
  if (await tooMany('code', visitor(req), 10, 60)) return back('billing=' + encodeURIComponent('Too many tries. Please wait an hour.'));
  const own = await ownedBusiness(id);
  if (!own.ok) return back('billing=' + encodeURIComponent('Please log in again.'));
  const b = own.business;
  if (String(fd.get('remove') ?? '') === '1') {
    await db().from('businesses').update({ signup_code: null }).eq('id', b.id);
    return back('code=removed');
  }
  const raw = cleanCode(fd.get('code'));
  if (!raw) return back('billing=' + encodeURIComponent('Type your code first.'));
  const found = await findCode(raw);
  if (!found) return back('billing=' + encodeURIComponent(`We do not recognise the code ${raw}. Check it and try again, or email admin@tlgb.co.uk.`));
  if (!usable(found.code, found.uses)) return back('billing=' + encodeURIComponent(`The code ${raw} has ended or been used up. Email admin@tlgb.co.uk and we will sort it.`));
  await db().from('businesses').update({ signup_code: found.code.code }).eq('id', b.id);
  return back('code=' + encodeURIComponent(`${found.code.code}: ${describe(found.code)}`));
}
