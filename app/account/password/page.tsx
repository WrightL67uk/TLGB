import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionEmail } from '@/lib/session';
import { hasPassword } from '@/lib/passwords';
import PasswordForm from './PasswordForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your password | TLGB' };

/** Set or change the password for whoever is logged in (trades, contractors and job seekers alike). */
export default async function PasswordPage({ searchParams }: { searchParams: Promise<{ back?: string }> }) {
  const email = await getSessionEmail();
  if (!email) redirect('/login?next=/account/password');
  const sp = await searchParams;
  const back = typeof sp.back === 'string' && sp.back.startsWith('/') && !sp.back.startsWith('//') ? sp.back : '/account';
  const has = await hasPassword(email);
  return (
    <div className="narrow">
      <p className="small"><Link href={back}>Back</Link></p>
      <h1>{has ? 'Change your password' : 'Set a password'}</h1>
      <p className="lead">
        {has ? 'Choose a new password for ' : 'Set a password so you can log in with '}
        <strong>{email}</strong>{has ? '.' : ' and a password, without waiting for an email.'}
      </p>
      <PasswordForm back={back} />
    </div>
  );
}
