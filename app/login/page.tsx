import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionEmail, safeNext } from '@/lib/session';
import { contractorByEmail } from '@/lib/contractors';
import { currentRole, isRole, roleFromPath, roleShort } from '@/lib/roles';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Log in | The Little Green Book', robots: { index: false, follow: true } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string; as?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const email = await getSessionEmail();
  const asked = isRole(sp.as) ? sp.as : roleFromPath(next);
  if (email) {
    const cur = await currentRole();
    if (cur && asked && cur !== asked) {
      return (
        <div className="narrow">
          <h1>This area is for a different sign-in</h1>
          <p className="lead">This is only for <strong>{roleShort(asked)}s</strong>. You are signed in as a <strong>{roleShort(cur)}</strong> ({email}).</p>
          <p>If you meant to be here, log out and sign in again as a {roleShort(asked)}. Otherwise carry on as you were. You are not logged out unless you choose to be.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <Link href="/account" className="primary" style={{ textDecoration: 'none' }}>Back to my area</Link>
            <form action="/api/auth/logout" method="post">
              <input type="hidden" name="next" value={`/login?as=${asked}&next=${encodeURIComponent(next)}`} />
              <button type="submit" className="linkish">Log out and sign in as a {roleShort(asked)}</button>
            </form>
          </div>
        </div>
      );
    }
    // Logged in as a trade but heading for the contractor area (or the other way round):
    // offer to switch accounts rather than sending them back and forth.
    const wrongAccount = next.startsWith('/contractor') && !(await contractorByEmail(email));
    if (!wrongAccount) redirect(next);
    return (
      <div className="narrow">
        <h1>Switch account?</h1>
        <p className="lead">You are logged in as <strong>{email}</strong>, which is a trade listing, not a main contractor account.</p>
        <form action="/api/auth/logout" method="post" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input type="hidden" name="next" value={`/login?next=${encodeURIComponent(next)}`} />
          <button type="submit" className="primary">Log out and log in as a contractor</button>
          <Link href="/account" style={{ alignSelf: 'center' }}>Back to my listing</Link>
        </form>
      </div>
    );
  }
  const { error } = sp;
  return (
    <div className="narrow">
      <h1>{next === '/leads' ? 'Log in to see all leads' : 'Log in'}</h1>
      <p className="lead">Log in with your email and password.</p>
      {error === 'expired' && (
        <p className="err big">That login link has expired or has already been used. Ask for a new one below.</p>
      )}
      <LoginForm next={next} initialRole={asked} />
      <p className="muted" style={{ marginTop: 24 }}>Not listed yet? <Link href="/join">List your business</Link>. Looking for work? <Link href="/looking-for-work">Post a free job seeker profile</Link>.</p>
    </div>
  );
}
