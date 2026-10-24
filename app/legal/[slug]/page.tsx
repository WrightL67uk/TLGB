import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LEGAL_PAGES } from '../pages';
import { legalDetails, LEGAL_UPDATED } from '@/lib/legal';
import '../../resources.css';

export const dynamicParams = false;
export const generateStaticParams = () => LEGAL_PAGES.map((p) => ({ slug: p.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = LEGAL_PAGES.find((x) => x.slug === slug);
  return { title: p ? `${p.title} | The Little Green Book` : 'The Little Green Book', description: p?.summary };
}

export default async function LegalDoc({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = LEGAL_PAGES.find((p) => p.slug === slug);
  if (!page) notFound();
  return (
    <article className="guide legal">
      <p className="small"><Link href="/legal">Legal and policies</Link></p>
      <h1>{page.title}</h1>
      <p className="muted small">Last updated {LEGAL_UPDATED}</p>
      {page.body(legalDetails())}
      <p className="muted small" style={{ marginTop: 32 }}>
        Also see: {LEGAL_PAGES.filter((p) => p.slug !== slug).map((p, i) => (
          <span key={p.slug}>{i > 0 && ' · '}<Link href={`/legal/${p.slug}`}>{p.title}</Link></span>
        ))}
      </p>
    </article>
  );
}
