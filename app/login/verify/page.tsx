export const metadata = { title: 'Log in | TLGB' };

// Shows a button instead of logging in straight away. Company email filters
// (Microsoft Defender, Mimecast) open links to scan them, which would use up a
// one-time link before the person clicks it. A button they press avoids that.
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string; next?: string }> }) {
  const { token, next } = await searchParams;
  const safe = typeof next === 'string' && /^\/(?![/\\])[^\s\\]{0,199}$/.test(next) ? next : '';
  const label = safe === '/leads' ? 'Log in and see all leads' : 'Log in now';
  return (
    <div className="narrow center">
      <h1>One more step</h1>
      {token ? (
        <>
          <p className="lead">Press the button below to finish logging in. You are not logged in until you do.</p>
          <form action="/api/auth/verify" method="post" style={{ marginTop: 24 }}>
            <input type="hidden" name="token" value={token} />
            {safe && <input type="hidden" name="next" value={safe} />}
            <button type="submit" className="primary" style={{ fontSize: '1.15rem', padding: '14px 28px' }}>{label}</button>
          </form>
          <p className="muted small" style={{ marginTop: 18 }}>This extra step stops email security scanners using up your link before you do.</p>
        </>
      ) : (
        <p className="err big">This link is incomplete. Copy the whole link from your email, or ask for a new one.</p>
      )}
    </div>
  );
}
