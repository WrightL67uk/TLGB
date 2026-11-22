import Link from 'next/link';

export const metadata = { title: 'Unsubscribe | The Little Green Book', robots: { index: false } };

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ id?: string; state?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="narrow">
      {sp.state === 'done' ? (
        <>
          <h1>You have been unsubscribed</h1>
          <p className="lead">You will not get any more newsletters from us. Sorry to see you go.</p>
          <p><Link href="/">Back to the home page</Link></p>
        </>
      ) : sp.state === 'bad' || !sp.id ? (
        <>
          <h1>That link did not work</h1>
          <p>Please email <a href="mailto:admin@tlgb.co.uk">admin@tlgb.co.uk</a> and we will remove you.</p>
        </>
      ) : (
        <>
          <h1>Unsubscribe</h1>
          <p className="lead">Press the button to stop receiving the Little Green Book newsletter.</p>
          <form method="post" action="/api/newsletter/unsubscribe">
            <input type="hidden" name="id" value={sp.id} />
            <button type="submit">Unsubscribe me</button>
          </form>
        </>
      )}
    </div>
  );
}
