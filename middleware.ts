import { NextRequest, NextResponse } from 'next/server';

// Phase 1 admin protection: HTTP Basic Auth on /admin and /api/admin.
// Swap for proper Supabase Auth logins once there is more than one admin.

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function middleware(req: NextRequest) {
  const user = process.env.ADMIN_USERNAME;
  const pass = process.env.ADMIN_PASSWORD;
  if (!user || !pass) {
    return new NextResponse('Admin is not configured', { status: 503 });
  }

  const header = req.headers.get('authorization') ?? '';
  if (header.startsWith('Basic ')) {
    const [u, ...rest] = atob(header.slice(6)).split(':');
    if (safeEqual(u, user) && safeEqual(rest.join(':'), pass)) {
      return NextResponse.next();
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="TLGB Admin"' },
  });
}

export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] };
