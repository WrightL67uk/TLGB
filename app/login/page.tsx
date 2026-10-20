import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionEmail, safeNext } from '@/lib/session';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Log in | TLGB' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getSessionEmail()) redirect(next);
  const { error } = sp;
  return (
    <div className="narrow">
      <h1>{next === '/leads' ? 'Log in to see all leads' : 'Log in'}</h1>
      <p className="lead">No password needed. Enter your email and we will send you a link to log in.</p>
      {error === 'expired' && (
        <p className="err big">That login link has expired or has already been used. Ask for a new one below.</p>
      )}
      <LoginForm next={next} />
      <p className="muted" style={{ marginTop: 24 }}>Not listed yet? <Link href="/join">List your business</Link></p>
    </div>
  );
}
