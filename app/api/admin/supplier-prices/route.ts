import { NextRequest, NextResponse } from 'next/server';
import { getSupplierPricing, saveSupplierPricing } from '@/lib/supplierPricing';

export const runtime = 'nodejs';

// Behind the admin login (middleware). Saves the two yearly supplier plan prices.
const back = (req: NextRequest, q: string) => NextResponse.redirect(new URL(`/admin/prices?${q}`, req.url), 303);

export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  if (!fd) return back(req, 'error=' + encodeURIComponent('Nothing was sent.'));
  const read = (name: string) => {
    const n = Number(String(fd.get(name) ?? '').replace(/[£,\s]/g, ''));
    return Number.isFinite(n) && n >= 1 && n < 100000 ? Math.round(n) : null;
  };
  const appear = read('supplier_appear');
  const match = read('supplier_match');
  if (appear == null || match == null) return back(req, 'error=' + encodeURIComponent('Enter whole-pound prices for Appear and Match.'));
  if (match <= appear) return back(req, 'error=' + encodeURIComponent('Match needs to cost more than Appear, since it includes everything in Appear.'));
  const before = await getSupplierPricing();
  const { error } = await saveSupplierPricing({ appear, match });
  if (error) { console.error('save supplier prices failed', error); return back(req, 'error=' + encodeURIComponent('Could not save the supplier prices.')); }
  const changes: string[] = [];
  if (before.appear !== appear) changes.push(`Appear £${before.appear} to £${appear}`);
  if (before.match !== match) changes.push(`Match £${before.match} to £${match}`);
  return back(req, 'msg=' + encodeURIComponent(changes.length ? `Saved: ${changes.join('; ')}.` : 'No changes.'));
}
