import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

export const runtime = 'nodejs';

// Behind the admin login (middleware). Throws away the stored VAT takings and 12-month estimate so the
// admin page reads Stripe again on the next load.
export async function POST(req: NextRequest) {
  revalidateTag('vat');
  return NextResponse.redirect(new URL('/admin', req.url), 303);
}
