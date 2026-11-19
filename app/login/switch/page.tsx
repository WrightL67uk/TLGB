import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionEmail } from '@/lib/session';
import { currentRole, isRole, roleShort } from '@/lib/roles';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Switch sign-in | TLGB', robots: { index: false } };

export default async function SwitchPage({ searchParams }: { searchParams: Promise<{ to?: string }> }) {
  const { to } = await searchParams;
  const want = isRole(to) ? to : null;
  const [email, cur] = await Promise.all([getSessionEmail(), currentRole()]);
  if (!email || !want || !cur || cur === want) redirect(want ? `/login?as=${want}` : '/login');
  return (
    <div className="narrow">
      <h1>This area is for a different sign-in</h1>
      <p className="lead">This area is only for <strong>{roleShort(want)}s</strong>. You are signed in as a <strong>{roleShort(cur)}</strong> ({email}).</p>
      <p>If you meant to be here, log out and sign in again as a {roleShort(want)}. Otherwise carry on as you were. You are not logged out unless you choose to be.</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <Link href="/account" className="primary" style={{ textDecoration: 'none' }}>Back to my area</Link>
        <form action="/api/auth/logout" method="post">
          <input type="hidden" name="next" value={`/login?as=${want}`} />
          <button type="submit" className="linkish">Log out and sign in as a {roleShort(want)}</button>
        </form>
      </div>
    </div>
  );
}
