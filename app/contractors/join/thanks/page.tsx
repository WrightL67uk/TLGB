import Link from 'next/link';

export const metadata = { title: 'Thanks | The Little Green Book' };

export default function Thanks() {
  return (
    <div className="narrow">
      <h1>Thanks, we have your details</h1>
      <p className="lead">We will check your company and let you know by email, usually within one working day.</p>
      <p>You can log in now to search trades and start your shortlist. Posting jobs opens once you are approved.</p>
      <p><Link href="/login?next=/contractor" className="sq sq-rust">Log in</Link></p>
    </div>
  );
}
