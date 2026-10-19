export const metadata = { title: 'Log in | TLGB' };

// Shows a button instead of logging in straight away. Company email filters
// (Microsoft Defender, Mimecast) open links to scan them, which would use up a
// one-time link before the person clicks it. A button they press avoids that.
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="narrow center">
      <h1>Log in to The Little Green Book</h1>
      {token ? (
        <form action="/api/auth/verify" method="post" style={{ marginTop: 24 }}>
          <input type="hidden" name="token" value={token} />
          <button type="submit" className="primary">Continue to my listing</button>
        </form>
      ) : (
        <p className="err big">This link is incomplete. Copy the whole link from your email, or ask for a new one.</p>
      )}
    </div>
  );
}
