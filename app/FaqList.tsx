import type { Faq } from '@/lib/faqs';

/** Visible questions and answers, plus the same content published as schema.org FAQ data. */
export default function FaqList({ faqs, title = 'Common questions' }: { faqs: Faq[]; title?: string }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
  return (
    <section style={{ marginTop: 32 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <h2>{title}</h2>
      {faqs.map((f) => (
        <div key={f.q}>
          <h3 style={{ marginBottom: 4 }}>{f.q}</h3>
          <p style={{ marginTop: 0 }}>{f.a}</p>
        </div>
      ))}
    </section>
  );
}
