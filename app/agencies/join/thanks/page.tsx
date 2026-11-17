import Link from 'next/link';

export const metadata = { title: 'Thanks | The Little Green Book' };

export default async function Thanks({ searchParams }: { searchParams: Promise<{ paid?: string; unpaid?: string }> }) {
  const { unpaid } = await searchParams;
  return (
    <div className="narrow">
      {unpaid ? (
        <>
          <h1>Your details are saved, payment is still to do</h1>
          <p className="lead">We cannot check your agency until the annual plan is paid. Log in to finish the payment, and we will check you within 48 hours of it.</p>
          <p><Link href="/login?next=/recruiter" className="sq sq-rust">Log in and pay</Link></p>
        </>
      ) : (
        <>
          <h1>Thank you, payment received</h1>
          <p className="lead">We will check your agency and email you within 48 hours. Once you are approved you can start posting vacancies.</p>
          <p>If we cannot approve your agency, we refund your payment in full. You can log in now to see your dashboard and your own link for job seekers.</p>
          <p><Link href="/login?next=/recruiter" className="sq sq-rust">Log in</Link></p>
        </>
      )}
    </div>
  );
}
