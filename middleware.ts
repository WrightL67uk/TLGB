import { NextRequest, NextResponse } from 'next/server';

// 1. Member websites: <slug>.tlgb.co.uk is served from /site/<slug>.
// 2. Phase 1 admin protection: HTTP Basic Auth on /admin and /api/admin.

const ROOT = '.tlgb.co.uk';
const SITE_PAGES = new Set(['/', '/services', '/contact']);

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function memberSite(req: NextRequest) {
  const host = (req.headers.get('host') ?? '').toLowerCase().split(':')[0];
  if (!host.endsWith(ROOT)) return null;
  const sub = host.slice(0, -ROOT.length);
  if (!sub || sub === 'www' || sub.includes('.')) return null;
  return sub;
}

function bare(req: NextRequest, slug: string) {
  const headers = new Headers(req.headers);
  headers.set('x-tlgb-site', slug);
  return headers;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const slug = memberSite(req);

  if (slug) {
    if (pathname.startsWith('/api/site-enquiry') || pathname.startsWith('/_next') || pathname === '/robots.txt') {
      return NextResponse.next({ request: { headers: bare(req, slug) } });
    }
    if (!SITE_PAGES.has(pathname)) return NextResponse.redirect(new URL('/', req.url));
    const url = req.nextUrl.clone();
    url.pathname = `/site/${slug}${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(url, { request: { headers: bare(req, slug) } });
  }

  // Previews of member sites on the main domain also render without the TLGB header and footer.
  if (pathname.startsWith('/site/')) {
    return NextResponse.next({ request: { headers: bare(req, pathname.split('/')[2] ?? '') } });
  }

  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const user = process.env.ADMIN_USERNAME;
    const pass = process.env.ADMIN_PASSWORD;
    if (!user || !pass) return new NextResponse('Admin is not configured', { status: 503 });
    const header = req.headers.get('authorization') ?? '';
    if (header.startsWith('Basic ')) {
      const [u, ...rest] = atob(header.slice(6)).split(':');
      if (safeEqual(u, user) && safeEqual(rest.join(':'), pass)) return NextResponse.next();
    }
    return new NextResponse('Authentication required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="TLGB Admin"' },
    });
  }

  // A shared link like /join?code=TRUDY25 remembers the code for 30 days, so it is applied at payment.
  const code = req.nextUrl.searchParams.get('code');
  if (code && /^[A-Za-z0-9]{3,20}$/.test(code)) {
    const res = NextResponse.next();
    res.cookies.set('tlgb_code', code.toUpperCase(), { maxAge: 60 * 60 * 24 * 30, path: '/', sameSite: 'lax', httpOnly: true, secure: true });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|txt|xml|mp4)$).*)'],
};
