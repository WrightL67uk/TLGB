import Link from 'next/link';
import type { Metadata } from 'next';
import { ADVICE } from '@/lib/advice';

export const metadata: Metadata = {
  title: 'Advice on hiring a trade | The Little Green Book',
  description: 'Plain advice on hiring landscapers, gardeners, tree surgeons and other trades: how to check they are genuine, red flags, quotes and insurance.',
  alternates: { canonical: '/advice' },
};

export default function AdviceIndex() {
  return (
    <div className="narrow">
      <h1>Advice on hiring a trade</h1>
      <p className="lead">Short, plain guides for anyone hiring a landscaper, gardener, tree surgeon or other outdoor trade.</p>
      <ul>
        {ADVICE.map((a) => <li key={a.slug} style={{ marginBottom: 10 }}><Link href={`/advice/${a.slug}`}>{a.title}</Link>: {a.summary}</li>)}
      </ul>
      <p><Link href="/search">Find a checked trade near you</Link> or <Link href="/find">browse trades by area</Link>.</p>
    </div>
  );
}
