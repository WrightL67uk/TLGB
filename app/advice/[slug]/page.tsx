import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ADVICE, advice } from '@/lib/advice';
import { siteUrl } from '@/lib/config';
import FaqList from '@/app/FaqList';

export function generateStaticParams() {
  return ADVICE.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = advice((await params).slug);
  if (!a) return { title: 'Not found | The Little Green Book', robots: { index: false } };
  return { title: `${a.title} | The Little Green Book`, description: a.summary, alternates: { canonical: `/advice/${a.slug}` } };
}

/** Turns [words](/path) into links and **words** into bold; everything else stays plain text. */
function Text({ s }: { s: string }) {
  const parts = s.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        const l = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (l) return <Link key={i} href={l[2]}>{l[1]}</Link>;
        const b = p.match(/^\*\*([^*]+)\*\*$/);
        return b ? <strong key={i}>{b[1]}</strong> : <span key={i}>{p}</span>;
      })}
    </>
  );
}

export default async function AdvicePage({ params }: { params: Promise<{ slug: string }> }) {
  const a = advice((await params).slug);
  if (!a) notFound();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: a.summary,
    dateModified: a.updated,
    mainEntityOfPage: `${siteUrl()}/advice/${a.slug}`,
    publisher: { '@type': 'Organization', name: 'The Little Green Book', url: siteUrl() },
  };
  const others = ADVICE.filter((x) => x.slug !== a.slug);
  return (
    <article className="narrow">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <p><Link href="/advice">&larr; All advice</Link></p>
      <h1>{a.title}</h1>
      <p className="lead">{a.intro}</p>
      {a.sections.map((s) => (
        <section key={s.h}>
          <h2>{s.h}</h2>
          {s.p?.map((t, i) => <p key={i}><Text s={t} /></p>)}
          {s.steps && <ol>{s.steps.map((t, i) => <li key={i}><Text s={t} /></li>)}</ol>}
          {s.list && <ul>{s.list.map((t, i) => <li key={i}><Text s={t} /></li>)}</ul>}
        </section>
      ))}
      <FaqList faqs={a.faq} />
      <h2>More advice</h2>
      <ul>{others.map((x) => <li key={x.slug}><Link href={`/advice/${x.slug}`}>{x.title}</Link></li>)}</ul>
    </article>
  );
}
