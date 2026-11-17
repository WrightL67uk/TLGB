import Link from 'next/link';

export const metadata = { title: 'Thanks | The Little Green Book' };

export default function Thanks() {
  return (
    <div className="narrow">
      <h1>Thanks, we have your details</h1>
      <p className="lead">We will check your agency and let you know by email, usually within one working day.</p>
      <p>You can log in now to see your dashboard. Posting vacancies opens once you are approved.</p>
      <p><Link href="/login?next=/recruiter" className="sq sq-rust">Log in</Link></p>
    </div>
  );
}
