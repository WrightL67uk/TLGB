import { NextRequest, NextResponse } from 'next/server';
import { TURNOVER_BANDS } from '@/lib/config';
import { getPricing, savePricing, type Pricing } from '@/lib/pricing';

export const runtime = 'nodejs';

// Behind the admin password (middleware). Saves membership prices and which pricing is charged.
const back = (req: NextRequest, q: string) => NextResponse.redirect(new URL(`/admin/prices?${q}`, req.url), 303);

export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  if (!fd) return back(req, 'error=' + encodeURIComponent('Nothing was sent.'));
  const before = await getPricing();

  const read = (name: string) => {
    const n = Number(String(fd.get(name) ?? '').replace(/[£,\s]/g, ''));
    return Number.isFinite(n) && n >= 1 && n < 100000 ? Math.round(n) : null;
  };
  const bands: Record<string, number> = {};
  for (const b of TURNOVER_BANDS) {
    const v = read(`band_${b.key}`);
    if (v == null) return back(req, 'error=' + encodeURIComponent(`Enter a price in whole pounds for ${b.label}.`));
    bands[b.key] = v;
  }
  const verified = read('plan_verified');
  const pro = read('plan_pro');
  if (verified == null || pro == null) return back(req, 'error=' + encodeURIComponent('Enter prices in whole pounds for Verified and Pro.'));
  if (pro <= verified) return back(req, 'error=' + encodeURIComponent('Pro needs to cost more than Verified.'));
  const monthly = read('mem_monthly');
  const yearly = read('mem_yearly');
  if (monthly == null || yearly == null) return back(req, 'error=' + encodeURIComponent('Enter monthly and yearly prices in whole pounds.'));
  if (yearly >= monthly * 12) return back(req, 'error=' + encodeURIComponent(`The yearly price needs to be less than 12 monthly payments (£${monthly * 12}), or nobody will pay yearly.`));
  const trialRaw = Number(String(fd.get('mem_trial') ?? '0'));
  if (!Number.isFinite(trialRaw) || trialRaw < 0 || trialRaw > 90) return back(req, 'error=' + encodeURIComponent('The free trial can be 0 to 90 days.'));
  const trial_days = Math.round(trialRaw);

  const modeIn = String(fd.get('mode') ?? '');
  const next: Pricing = {
    mode: modeIn === 'plans' || modeIn === 'membership' ? modeIn : 'bands',
    bands,
    plans: { verified, pro },
    membership: { monthly, yearly, trial_days },
  };
  const { error } = await savePricing(next);
  if (error) {
    console.error('save pricing failed', error);
    return back(req, 'error=' + encodeURIComponent('Could not save the prices.'));
  }

  const changes: string[] = [];
  const modeName = { bands: 'turnover bands', plans: 'Verified and Pro', membership: 'free, monthly or yearly' };
  if (before.mode !== next.mode) changes.push(`charging switched to ${modeName[next.mode]}`);
  for (const b of TURNOVER_BANDS) if (before.bands[b.key] !== next.bands[b.key]) changes.push(`${b.label} £${before.bands[b.key]} to £${next.bands[b.key]}`);
  if (before.plans.verified !== verified) changes.push(`Verified £${before.plans.verified} to £${verified}`);
  if (before.plans.pro !== pro) changes.push(`Pro £${before.plans.pro} to £${pro}`);
  if (before.membership.monthly !== monthly) changes.push(`monthly £${before.membership.monthly} to £${monthly}`);
  if (before.membership.yearly !== yearly) changes.push(`yearly £${before.membership.yearly} to £${yearly}`);
  if (before.membership.trial_days !== trial_days) changes.push(`free trial ${before.membership.trial_days} to ${trial_days} days`);
  return back(req, 'msg=' + encodeURIComponent(changes.length ? `Saved: ${changes.join('; ')}.` : 'No changes.'));
}
