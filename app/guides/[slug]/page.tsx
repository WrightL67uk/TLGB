import Link from 'next/link';
import { notFound } from 'next/navigation';
import { HOW_TOS, GROUPS, howTo } from '@/lib/howTo';
import '../../resources.css';

export function generateStaticParams() {
  return HOW_TOS.map((h) => ({ slug: h.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const h = howTo((await params).slug);
  return h ? { title: `${h.title} | The Little Green Book`, description: h.summary } : {};
}

/** Turns [words](/path) into links; everything else stays plain text. */
function Text({ s }: { s: string }) {
  const parts = s.split(/(\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        return m ? <Link key={i} href={m[2]}>{m[1]}</Link> : <span key={i}>{p}</span>;
      })}
    </>
  );
}

export default async function HowToPage({ params }: { params: Promise<{ slug: string }> }) {
  const h = howTo((await params).slug);
  if (!h) notFound();
  const group = GROUPS.find((g) => g.key === h.group);
  const related = HOW_TOS.filter((x) => x.group === h.group && x.slug !== h.slug);
  return (
    <article className="guide">
      <p className="small muted"><Link href="/guides">Guides</Link> · {group?.title}</p>
      <h1>{h.title}</h1>
      <p className="lead">{h.intro}</p>
      {h.sections.map((s) => (
        <section key={s.h}>
          <h2>{s.h}</h2>
          {s.p?.map((t, i) => <p key={i}><Text s={t} /></p>)}
          {s.steps && <ol>{s.steps.map((t, i) => <li key={i}><Text s={t} /></li>)}</ol>}
          {s.list && <ul>{s.list.map((t, i) => <li key={i}><Text s={t} /></li>)}</ul>}
          {s.tip && <div className="callout"><p><strong>Tip:</strong> <Text s={s.tip} /></p></div>}
        </section>
      ))}
      {h.cta && (
        <div className="next">
          {h.cta.map((c, i) => (
            <Link key={c.href} href={c.href} className="sq" style={{ background: i === 0 ? 'var(--rust)' : 'var(--forest)' }}>{c.label}</Link>
          ))}
        </div>
      )}
      {related.length > 0 && (
        <>
          <h2>More in {group?.title.toLowerCase()}</h2>
          <ul>{related.map((r) => <li key={r.slug}><Link href={`/guides/${r.slug}`}>{r.title}</Link>: {r.summary}</li>)}</ul>
        </>
      )}
      <p style={{ marginTop: 32 }}><Link href="/guides">All guides</Link></p>
    </article>
  );
}
