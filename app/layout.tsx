import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/session';
import { LOGO_SRC } from '@/lib/logo';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Little Green Book',
  description: 'Find vetted landscape and external works trades near your job.',
  icons: { icon: LOGO_SRC },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const loggedIn = (await cookies()).has(SESSION_COOKIE);
  return (
    <html lang="en-GB">
      <body>
        <div className="util">
          <div className="util-in">
            {loggedIn
              ? <Link href="/account" className="util-b util-green">my account</Link>
              : <>
                  <Link href="/contractors" className="util-b util-teal">main contractors</Link>
                  <Link href="/join" className="util-b util-rust">list your business</Link>
                  <Link href="/login" className="util-b util-green">log in</Link>
                </>}
          </div>
        </div>
        <header className="top">
          <div className="top-in">
            <Link href="/" className="brand" aria-label="The Little Green Book home">
              <img src={LOGO_SRC} alt="TLGB, The Little Green Book" width={72} height={71} />
            </Link>
            <nav className="mainnav">
              <Link href="/search">find a trade</Link>
              <Link href="/leads">leads</Link>
              <Link href="/jobs">jobs</Link>
              <Link href="/suppliers">suppliers</Link>
              <Link href="/help-board">help board</Link>
              <Link href="/guides">guides</Link>
              <Link href="/join">for trades</Link>
              <Link href="/menu" className="nav-all">all pages</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="foot">
          <div className="foot-in">
            <div>
              <img src={LOGO_SRC} alt="" width={56} height={55} className="foot-logo" />
              <p>The Little Green Book. A directory of checked landscaping and external works trades.</p>
            </div>
            <nav>
              <Link href="/search">find a trade</Link>
              <Link href="/leads">leads</Link>
              <Link href="/suppliers">suppliers</Link>
              <Link href="/help-board">help board</Link>
              <Link href="/supply-chains">supply chain finder</Link>
              <Link href="/guides">guides</Link>
              <Link href="/accreditation-help">accreditation help</Link>
              <Link href="/#checks">what we check</Link>
              <Link href="/join">list your business</Link>
              <Link href="/jobs">jobs from contractors</Link>
              <Link href="/contractors">for main contractors</Link>
              <Link href="/login">log in</Link>
              <Link href="/menu">everything on TLGB</Link>
            </nav>
          </div>
          <nav className="foot-legal">
            <Link href="/legal/terms">Website terms</Link>
            <Link href="/legal/member-terms">Member terms</Link>
            <Link href="/legal/contractor-terms">Contractor terms</Link>
            <Link href="/legal/privacy">Privacy notice</Link>
            <Link href="/legal/cookies">Cookies</Link>
            <Link href="/legal/acceptable-use">Acceptable use</Link>
            <Link href="/legal/complaints">Complaints</Link>
          </nav>
          <p className="foot-small">&copy; {new Date().getFullYear()} The Little Green Book</p>
        </footer>
      </body>
    </html>
  );
}
