import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/session';
import { LOGO_SRC } from '@/lib/logo';
import { currentRole } from '@/lib/roles';
import SupportWidget from './SupportWidget';
import Analytics from './Analytics';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Little Green Book',
  description: 'Find vetted landscape and external works trades near your job.',
  icons: { icon: LOGO_SRC },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Member websites (<slug>.tlgb.co.uk) carry their own header and footer.
  if ((await headers()).get('x-tlgb-site')) {
    return (
      <html lang="en-GB">
        <body className="msite-body">{children}<Analytics /></body>
      </html>
    );
  }
  const loggedIn = (await cookies()).has(SESSION_COOKIE);
  // If they are signed in, tell support which kind of user is asking
  const role = loggedIn ? await currentRole() : null;
  const supportWho = ({ trade: 'trade', supplier: 'supplier', agency: 'recruitment-agency', seeker: 'job-seeker', contractor: 'main-contractor' } as Record<string, string>)[role ?? ''] ?? null;
  return (
    <html lang="en-GB">
      <body>
        <div className="util">
          <div className="util-in">
            {loggedIn
              ? <>
                  <Link href="/account" className="util-b util-green">my account</Link>
                  <Link href="/contact" className="util-b util-teal">contact</Link>
                </>
              : <>
                  <Link href="/contractors" className="util-b util-teal">main contractors</Link>
                  <Link href="/join" className="util-b util-rust">list your business</Link>
                  <Link href="/contact" className="util-b util-teal">contact</Link>
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
              <Link href="/tenders">tenders</Link>
              <Link href="/recruitment">recruitment</Link>
              <Link href="/suppliers">suppliers</Link>
              <Link href="/help-hub">help hub</Link>
              <Link href="/account/quotes">estimates</Link>
              <Link href="/guides">guides</Link>
              <Link href="/toolkit">toolkit</Link>
              <Link href="/join">sign up</Link>
              <Link href="/menu" className="nav-all">all pages</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="foot">
          <div className="foot-in">
            <div>
              <img src={LOGO_SRC} alt="The Little Green Book" width={56} height={55} className="foot-logo" />
              <p>The Little Green Book. A directory of checked landscaping and external works trades.</p>
            </div>
            <nav className="foot-cols" aria-label="Site">
              <div>
                <h3>Find</h3>
                <Link href="/search">Find a trade</Link>
                <Link href="/suppliers">Suppliers</Link>
                <Link href="/tenders">Tenders</Link>
                <Link href="/recruitment">Recruitment</Link>
                <Link href="/help-hub">Help Hub</Link>
              </div>
              <div>
                <h3>Tools</h3>
                <Link href="/account/quotes">Estimates</Link>
                <Link href="/toolkit">Toolkit</Link>
                <Link href="/guides">Guides</Link>
                <Link href="/supply-chains">Supply chain finder</Link>
                <Link href="/accreditation-help">Accreditation help</Link>
              </div>
              <div>
                <h3>Join</h3>
                <Link href="/join">List your business</Link>
                <Link href="/suppliers/join">Supplier plans</Link>
                <Link href="/contractors">For main contractors</Link>
                <Link href="/looking-for-work">Looking for work</Link>
                <Link href="/#checks">What we check</Link>
              </div>
              <div>
                <h3>Account</h3>
                <Link href="/login">Log in</Link>
                <Link href="/contact">Contact us</Link>
                <Link href="/menu">Everything on TLGB</Link>
              </div>
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
            <Link href="/contact">Contact</Link>
          </nav>
          <p className="foot-small">&copy; {new Date().getFullYear()} The Little Green Book</p>
        </footer>
        <SupportWidget who={supportWho} />
        <Analytics />
      </body>
    </html>
  );
}
