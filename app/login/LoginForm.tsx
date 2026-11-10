'use client';

import { useState } from 'react';

export default function LoginForm({ next = '/account' }: { next?: string }) {
  const [mode, setMode] = useState<'password' | 'link'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post(url: string, body: object) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return await res.json();
    } catch {
      setError('Could not connect. Check your internet and try again.');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function logIn(e: React.FormEvent) {
    e.preventDefault();
    const json = await post('/api/auth/password', { email, password, next });
    if (!json) return;
    if (json.ok) window.location.assign(json.next || next);
    else setError(json.error ?? 'Something went wrong. Try again.');
  }

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    const json = await post('/api/auth/request-link', { email, next });
    if (!json) return;
    if (json.ok) setSent(true);
    else setError(json.error ?? 'Something went wrong. Try again.');
  }

  if (sent) {
    return (
      <div className="ok-box">
        <p><strong>Check your email.</strong></p>
        <p>If <strong>{email}</strong> has an account with us, we have sent a login link to it. The link works once and lasts 30 minutes.</p>
        <p className="muted small">Once you are in, you can set a password from your account so you don&rsquo;t need a link next time. Nothing arrived? Check your junk folder.</p>
      </div>
    );
  }

  if (mode === 'link') {
    return (
      <form onSubmit={sendLink} className="form">
        <p className="muted" style={{ marginTop: 0 }}>Forgotten your password, or not set one yet? We will email you a link that logs you straight in.</p>
        <label htmlFor="login-email">Email address
          <input id="login-email" type="email" required autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="name@company.co.uk" />
        </label>
        {error && <p className="err">{error}</p>}
        <button type="submit" className="primary" disabled={busy}>{busy ? 'Sending...' : 'Email me a login link'}</button>
        <p className="small"><button type="button" className="linkish" onClick={() => { setMode('password'); setError(null); }}>Log in with your password instead</button></p>
      </form>
    );
  }

  return (
    <form onSubmit={logIn} className="form">
      <label htmlFor="login-email">Email address
        <input id="login-email" type="email" required autoComplete="email" value={email}
          onChange={(e) => setEmail(e.target.value)} placeholder="name@company.co.uk" />
      </label>
      <label htmlFor="login-password">Password
        <input id="login-password" type="password" required autoComplete="current-password" value={password}
          onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && <p className="err">{error}</p>}
      <button type="submit" className="primary" disabled={busy}>{busy ? 'Logging in...' : 'Log in'}</button>
      <p className="small">
        <button type="button" className="linkish" onClick={() => { setMode('link'); setError(null); }}>Forgotten your password, or not set one? Email me a login link</button>
      </p>
    </form>
  );
}
