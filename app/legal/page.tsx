import Link from 'next/link';
import { LEGAL_PAGES } from './pages';
import '../resources.css';

export const metadata = { title: 'Legal and policies | The Little Green Book' };

export default function LegalIndex() {
  return (
    <article className="guide">
      <h1>Legal and policies</h1>
      <p className="lead">The terms for using The Little Green Book, and how we handle your information.</p>
      <div className="guide-index">
        {LEGAL_PAGES.map((p) => (
          <Link key={p.slug} href={`/legal/${p.slug}`}>
            <h2>{p.title}</h2>
            <p>{p.summary}</p>
          </Link>
        ))}
      </div>
    </article>
  );
}
