import Link from 'next/link';
import type { Metadata } from 'next';
import { CONSENT_TEXT, WRITE_TEXT } from '@/lib/newsletter';

export const metadata: Metadata = {
  title: 'Newsletter | The Little Green Book',
  description: 'News, tips and updates for the UK landscaping and external works industry, from The Little Green Book. Free to join.',
  alternates: { canonical: '/newsletter' },
};

export default async function NewsletterPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string; src?: string }> }) {
  const sp = await searchParams;
  const src = (sp.src ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30);
  return (
    <div className="narrow">
      <h1>The Little Green Book newsletter</h1>
      <p className="lead">News, practical tips and updates for the UK landscaping and external works industry. Free, and you can unsubscribe at any time.</p>

      {sp.sent ? (
        <div className="ok-box">
          <h2 style={{ marginTop: 0 }}>Check your email</h2>
          <p style={{ marginBottom: 0 }}>We have sent you a message with a button to confirm your address. You will not receive the newsletter until you press it. If it does not arrive in a few minutes, look in your junk folder.</p>
        </div>
      ) : (
        <form method="post" action="/api/newsletter" className="stack" style={{ maxWidth: 480 }}>
          {sp.error && <p className="err big">{sp.error}</p>}
          <input type="hidden" name="src" value={src} />
          {/* Hidden from people; bots tend to fill it in */}
          <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
            <label>Website <input name="website_url" tabIndex={-1} autoComplete="off" /></label>
          </div>
          <label>Your name
            <input name="name" required maxLength={100} autoComplete="name" />
          </label>
          <label>Your email address
            <input name="email" type="email" required maxLength={200} autoComplete="email" />
          </label>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontWeight: 400 }}>
            <input type="checkbox" name="consent" value="yes" required style={{ width: 22, height: 22, marginTop: 2, flex: '0 0 auto' }} />
            <span>{CONSENT_TEXT}</span>
          </label>
          <fieldset style={{ border: '2px solid var(--forest, #163f27)', borderRadius: 10, padding: 16, margin: 0 }}>
            <legend style={{ fontWeight: 700, padding: '0 8px' }}>Want to write for us? (optional)</legend>
            <p style={{ marginTop: 0 }}>We are looking for people in the industry to write short articles for the newsletter. It is free promotion for your business, with a link to your website if you want one.</p>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontWeight: 700 }}>
              <input type="checkbox" name="write" value="yes" style={{ width: 22, height: 22, marginTop: 2, flex: '0 0 auto' }} />
              <span>{WRITE_TEXT}</span>
            </label>
            <label>Your business (optional)
              <input name="business" maxLength={120} autoComplete="organization" />
            </label>
            <label>Your website (optional)
              <input name="website" maxLength={200} inputMode="url" autoComplete="url" placeholder="www." />
            </label>
          </fieldset>
          <button type="submit">Subscribe</button>
          <p className="small muted">We use your name and email only to send you the newsletter. Read how we look after your information in our <Link href="/legal/privacy">privacy policy</Link>.</p>
        </form>
      )}
    </div>
  );
}
