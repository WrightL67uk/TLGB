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
      <h1>Switch sign-in?</h1>
      <p className="lead">You are signed in as a <strong>{roleShort(cur)}</strong> ({email}). This page is for a <strong>{roleShort(want)}</strong>.</p>
      <p>You can only be signed in as one thing at a time. Log out and sign in again as a {roleShort(want)}, using the same email if it holds both.</p>
      <form action="/api/auth/logout" method="post" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input type="hidden" name="next" value={`/login?as=${want}`} />
        <button type="submit" className="primary">Log out and sign in as a {roleShort(want)}</button>
        <Link href="/account" style={{ alignSelf: 'center' }}>Stay as I am</Link>
      </form>
    </div>
  );
}
