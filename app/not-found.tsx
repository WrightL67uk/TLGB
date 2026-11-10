import Link from 'next/link';

export const metadata = { title: 'Page not found | The Little Green Book' };

/** Shown for any address that does not exist (or a listing that is no longer public). */
export default function NotFound() {
  return (
    <div style={{ maxWidth: 640, margin: '40px auto' }}>
      <h1>We could not find that page</h1>
      <p className="lead">The link may be old, or the listing, vacancy or post may have been taken down.</p>
      <ul style={{ lineHeight: 1.9 }}>
        <li><Link href="/search">Find a trade</Link></li>
        <li><Link href="/tenders">Tenders</Link></li>
        <li><Link href="/recruitment">Recruitment</Link></li>
        <li><Link href="/menu">Everything on TLGB</Link></li>
      </ul>
      <p className="muted small">Think something is missing? Email <a href="mailto:admin@tlgb.co.uk">admin@tlgb.co.uk</a>.</p>
    </div>
  );
}
