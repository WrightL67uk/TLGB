import Link from 'next/link';
import { CONTACT_ROLES } from '@/lib/contact';
import '../resources.css';

export const metadata = {
  title: 'Contact us | The Little Green Book',
  description: 'Get in touch with The Little Green Book. Job seekers, trades, suppliers, agencies and main contractors all welcome.',
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string; who?: string }> }) {
  const { sent, error, who } = await searchParams;
  const chosen = CONTACT_ROLES.some((r) => r.key === who) ? who : '';
  return (
    <article className="guide">
      <h1>Contact us</h1>
      <p className="lead">Questions, ideas or something not working? Tell us who you are and what you need, and we will get back to you, usually within two working days.</p>

      {sent ? (
        <p className="ok-box"><strong>Thanks, your message has gone.</strong> We have emailed you a copy, and one of us will reply soon.</p>
      ) : (
        <form className="res-form" method="post" action="/api/contact">
          {error && <p className="err big" role="alert">{error}</p>}
          <label>Are you a&hellip;
            <select name="who" required defaultValue={chosen}>
              <option value="" disabled>Choose one</option>
              {CONTACT_ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </label>
          <div className="row">
            <label>Your name<input name="name" required maxLength={120} autoComplete="name" /></label>
            <label>Email address<input name="email" type="email" required maxLength={200} autoComplete="email" /></label>
          </div>
          <label>Business name <span className="muted small">(leave blank if you are an individual)</span>
            <input name="business" maxLength={160} autoComplete="organization" />
          </label>
          <label>Your message
            <textarea name="message" required minLength={5} maxLength={3000} rows={6} />
          </label>
          <label className="hp" aria-hidden="true">Leave this empty<input name="company_url" tabIndex={-1} autoComplete="off" /></label>
          <button type="submit" className="primary">send message</button>
        </form>
      )}

      <p className="muted small">We use your details only to answer you. See our <Link href="/legal/privacy">privacy notice</Link>. Existing members can also use the Help Hub or log in to manage their listing.</p>
    </article>
  );
}
