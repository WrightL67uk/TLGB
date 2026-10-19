import Link from 'next/link';

export default function ThanksPage() {
  return (
    <div className="narrow center">
      <h1>Application received</h1>
      <p className="lead">
        Thanks. We have emailed you a confirmation and will review your documents, usually within two working days.
      </p>
      <p className="ok-box">
        Not seeing our email? Check your junk folder, and add{' '}
        <strong>{process.env.EMAIL_FROM ?? 'our address'}</strong> to your contacts so our approval email reaches your inbox.
      </p>
      <p><Link href="/">Back to search</Link></p>
    </div>
  );
}
