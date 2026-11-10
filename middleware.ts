import { NextRequest, NextResponse } from 'next/server';

// 1. Member websites: <slug>.tlgb.co.uk is served from /site/<slug>.
// 2. Admin protection on /admin and /api/admin: an admin login cookie, checked against the database.
//    The Vercel ADMIN_USERNAME / ADMIN_PASSWORD master login is typed into /admin/login.

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

const OPEN_ADMIN = new Set(['/admin/login', '/admin/setup']);

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** True if the admin cookie matches a live admin session. */
async function adminSessionOk(raw: string | undefined) {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!raw || raw.length > 200 || !url || !key) return false;
  const h = await sha256Hex(raw);
  try {
    const res = await fetch(`${url}/rest/v1/admin_sessions?select=label&token_hash=eq.${h}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const rows = await res.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
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

  if ((pathname === '/admin' || pathname.startsWith('/admin/') || pathname === '/api/admin' || pathname.startsWith('/api/admin/')) && !OPEN_ADMIN.has(pathname)) {
    if (await adminSessionOk(req.cookies.get('tlgb_admin')?.value)) return NextResponse.next();
    // The old browser pop-up login is no longer accepted: everyone uses /admin/login, which has a log out.
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Please log in to admin.' }, { status: 401 });
    const login = new URL('/admin/login', req.url);
    login.searchParams.set('next', pathname + req.nextUrl.search);
    return NextResponse.redirect(login);
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
