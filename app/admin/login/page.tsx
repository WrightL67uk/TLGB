import Link from 'next/link';
import { safeNext } from '@/lib/session';

export const metadata = { title: 'Admin login | The Little Green Book', robots: { index: false } };

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; sent?: string; forgot?: string; out?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next, '/admin');
  return (
    <div style={{ maxWidth: 420, margin: "0 auto" }}>
      <h1>Admin login</h1>
      {sp.out && <p className="ok-box">You are logged out.</p>}
      {sp.sent && <p className="ok-box">If that email belongs to an admin, a link to reset the password is on its way. It runs out in an hour.</p>}
      {sp.error && <p className="err big">{sp.error.slice(0, 200)}</p>}
      {sp.forgot ? (
        <form method="post" action="/api/adminauth/forgot" className="stack">
          <p className="muted">Enter your admin email and we will send you a link to choose a new password.</p>
          <label>Email<input name="email" type="email" required autoComplete="email" /></label>
          <button type="submit">Send reset link</button>
          <p className="small"><Link href="/admin/login">Back to login</Link></p>
        </form>
      ) : (
        <form method="post" action="/api/adminauth/login" className="stack">
          <input type="hidden" name="next" value={next} />
          <label>Email<input name="email" required autoComplete="username" /></label>
          <label>Password<input name="password" type="password" required autoComplete="current-password" /></label>
          <button type="submit">Log in</button>
          <p className="small"><Link href="/admin/login?forgot=1">Forgotten your password?</Link></p>
        </form>
      )}
    </div>
  );
}
