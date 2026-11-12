import Link from 'next/link';
import { searchAudience } from '@/lib/homeUsers';
import '../resources.css';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Find a landscaper or supplier for your home | The Little Green Book',
  description: 'Free account for homeowners. Search checked local landscapers, gardeners, groundworkers and suppliers that work on domestic jobs.',
};

export default async function Homeowners({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string; next?: string }> }) {
  const sp = await searchParams;
  const audience = await searchAudience();
  const next = typeof sp.next === 'string' && /^\/(search|suppliers)(\?[^\s]{0,200})?$/.test(sp.next) ? sp.next : '/search';

  return (
    <div className="narrow">
      <h1>Find a landscaper or supplier for your home</h1>
      <p className="lead">Make a free account to search trades and suppliers near you that work on domestic jobs. Free for homeowners, always.</p>

      {audience !== 'anon' ? (
        <div className="panel">
          <p>You are logged in.</p>
          <p><Link href="/search" className="sq sq-rust">search for a trade</Link> <Link href="/suppliers" className="sq">search suppliers</Link></p>
        </div>
      ) : sp.sent ? (
        <div className="ok-box">
          <p><strong>Check your email.</strong> We have sent you a link to log in. It works once and lasts an hour.</p>
          <p className="small" style={{ margin: 0 }}>Not arrived? Check your junk folder, or <Link href="/login">ask for a new link</Link>.</p>
        </div>
      ) : (
        <form method="post" action="/api/home/join" className="res-form">
          <h2 style={{ margin: 0 }}>Create your free account</h2>
          {sp.error && <p className="err big">{sp.error}</p>}
          <input type="hidden" name="next" value={next} />
          <label className="hp" aria-hidden="true">Leave this empty<input name="company_url" tabIndex={-1} autoComplete="off" /></label>
          <div className="two">
            <label>First name<input name="first_name" required maxLength={60} autoComplete="given-name" /></label>
            <label>Surname<input name="last_name" required maxLength={60} autoComplete="family-name" /></label>
          </div>
          <label>Email<input type="email" name="email" required maxLength={200} autoComplete="email" />
            <span className="hint">We email you a link to log in. No password needed.</span></label>
          <label>Your postcode (optional)<input name="postcode" maxLength={10} autoComplete="postal-code" /></label>
          <label className="check"><input type="checkbox" name="agree" value="yes" required /> I agree to the <Link href="/legal/terms" target="_blank">website terms</Link> and have read the <Link href="/legal/privacy" target="_blank">privacy notice</Link>.</label>
          <div><button type="submit" className="sq sq-rust">Email me a link</button></div>
          <p className="muted small" style={{ margin: 0 }}>Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`}>Log in</Link>.</p>
        </form>
      )}
      <p className="muted small" style={{ marginTop: 16 }}>Run a trade business? <Link href="/join">List your business</Link>. Supply the trade? <Link href="/suppliers/join">See supplier plans</Link>.</p>
    </div>
  );
}
