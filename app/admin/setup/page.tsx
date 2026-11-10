import Link from 'next/link';
import { adminForToken } from '@/lib/adminAuth';
import { MIN_PASSWORD } from '@/lib/passwords';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Choose your admin password | The Little Green Book', robots: { index: false } };

export default async function AdminSetup({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const sp = await searchParams;
  const token = String(sp.token ?? '');
  const admin = await adminForToken(token);
  return (
    <div style={{ maxWidth: 420, margin: '0 auto' }}>
      <h1>Choose your admin password</h1>
      {!admin ? (
        <>
          <p className="err big">This link has been used or has run out.</p>
          <p>If you already chose a password, <Link href="/admin/login">log in here</Link>. Otherwise ask another admin to resend your invite, or use <Link href="/admin/login?forgot=1">forgotten password</Link>.</p>
        </>
      ) : (
        <form method="post" action="/api/adminauth/setup" className="stack">
          <p>Hi {admin.name}. You will log in with <strong>{admin.email}</strong>.</p>
          {sp.error && <p className="err">{sp.error.slice(0, 200)}</p>}
          <input type="hidden" name="token" value={token} />
          <label>Password<input name="password" type="password" required minLength={MIN_PASSWORD} autoComplete="new-password" /></label>
          <label>Type it again<input name="password2" type="password" required minLength={MIN_PASSWORD} autoComplete="new-password" /></label>
          <p className="hint">At least {MIN_PASSWORD} characters.</p>
          <button type="submit">Save and log in</button>
        </form>
      )}
    </div>
  );
}
