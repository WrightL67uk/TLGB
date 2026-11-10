import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/session';
import { passwordProblem } from '@/lib/passwords';
import { ADMIN_COOKIE, adminCookieOptions, adminForToken, createAdminSession, setAdminPassword } from '@/lib/adminAuth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const token = String(fd?.get('token') ?? '');
  const back = (msg: string) => NextResponse.redirect(new URL(`/admin/setup?token=${encodeURIComponent(token)}&error=${encodeURIComponent(msg)}`, req.url), 303);
  if (!fd || !sameOrigin(req)) return back('Please use the form.');
  const admin = await adminForToken(token);
  if (!admin) return NextResponse.redirect(new URL(`/admin/setup?token=x`, req.url), 303);
  const pw = String(fd.get('password') ?? '');
  if (pw !== String(fd.get('password2') ?? '')) return back('The two passwords do not match.');
  const problem = passwordProblem(pw);
  if (problem) return back(problem);
  const { error } = await setAdminPassword(admin.id, pw);
  if (error) return back('Something went wrong. Please try again.');
  const s = await createAdminSession(admin.id, admin.name);
  const res = NextResponse.redirect(new URL('/admin', req.url), 303);
  res.cookies.set(ADMIN_COOKIE, s.raw, adminCookieOptions(s.expires));
  return res;
}
