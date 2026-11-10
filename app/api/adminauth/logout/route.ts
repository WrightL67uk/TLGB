import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, endAdminSession } from '@/lib/adminAuth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  await endAdminSession(req.cookies.get(ADMIN_COOKIE)?.value);
  const res = NextResponse.redirect(new URL('/admin/login?out=1', req.url), 303);
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
