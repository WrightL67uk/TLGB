import Link from 'next/link';

export const metadata = { title: 'Confirm your email | The Little Green Book', robots: { index: false } };

export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ t?: string; state?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="narrow">
      {sp.state === 'done' ? (
        <>
          <h1>You are subscribed</h1>
          <p className="lead">Thank you. You will now receive the Little Green Book newsletter.</p>
          <p><Link href="/">Back to the home page</Link></p>
        </>
      ) : sp.state === 'bad' || !sp.t ? (
        <>
          <h1>That link did not work</h1>
          <p>It may have been used already or be out of date. You can <Link href="/newsletter">sign up again</Link> and we will send a new one.</p>
        </>
      ) : (
        <>
          <h1>Confirm your email address</h1>
          <p className="lead">Press the button to finish signing up to the Little Green Book newsletter.</p>
          <form method="post" action="/api/newsletter/confirm">
            <input type="hidden" name="t" value={sp.t} />
            <button type="submit">Confirm my subscription</button>
          </form>
        </>
      )}
    </div>
  );
}
