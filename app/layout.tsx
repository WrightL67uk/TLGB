import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/session';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Little Green Book',
  description: 'Find vetted landscape and external works trades near your job.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const loggedIn = (await cookies()).has(SESSION_COOKIE);
  return (
    <html lang="en-GB">
      <body>
        <header className="top">
          <Link href="/" className="brand">TLGB<span>The Little Green Book</span></Link>
          <nav>
            <Link href="/">Search</Link>
            {loggedIn
              ? <Link href="/account">My listing</Link>
              : <Link href="/login">Log in</Link>}
            {!loggedIn && <Link href="/join" className="btn-sm">List your business</Link>}
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
