import Link from 'next/link';

export const metadata = {
  title: 'See how it works | The Little Green Book',
  description: 'A walkthrough of The Little Green Book for horticulture and landscaping trades: getting found, the compliance pack, team cards, PQQs, payments, price requests, your free website and leads.',
  openGraph: {
    title: 'See how The Little Green Book works',
    description: 'An 8-minute walkthrough for horticulture and landscaping trades.',
    images: ['/video/tlgb-trades-tour.jpg'],
  },
};

const CHAPTERS = [
  'Get found by main contractors',
  'Compliance pack: share one link and see who has opened it',
  'Team cards and training records',
  'PQQ answer bank',
  'Payment tracker and letters',
  'Price requests to suppliers',
  'Your free website',
  'Leads, the help board and more',
];

export default function TourPage() {
  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <h1>See how The Little Green Book works</h1>
      <p className="lead">An 8-minute walkthrough for horticulture and landscaping trades, using a demo listing.</p>
      <video
        controls
        playsInline
        preload="metadata"
        poster="/video/tlgb-trades-tour.jpg"
        style={{ width: '100%', borderRadius: 12, background: '#14331f', display: 'block' }}
      >
        <source src="/video/tlgb-trades-tour.mp4" type="video/mp4" />
        Your browser cannot play this video. <a href="/video/tlgb-trades-tour.mp4">Download it here</a>.
      </video>
      <h2 style={{ marginTop: 28 }}>What it covers</h2>
      <ol>
        {CHAPTERS.map((c) => <li key={c}>{c}</li>)}
      </ol>
      <p style={{ marginTop: 24 }}>
        <Link href="/join" className="primary" style={{ display: "inline-block", textDecoration: "none" }}>Apply to be listed</Link>{' '}
        <span className="muted">Free to apply. Every business is checked by hand.</span>
      </p>
    </div>
  );
}
