'use client';

import { useState } from 'react';

export default function LoginForm({ next = '/account' }: { next?: string }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, next }),
      });
      const json = await res.json();
      if (!json.ok) setError(json.error ?? 'Something went wrong. Try again.');
      else setSent(true);
    } catch {
      setError('Could not connect. Check your internet and try again.');
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="ok-box">
        <p><strong>Check your email.</strong></p>
        <p>If <strong>{email}</strong> has a listing with us, we have sent a login link to it. The link works once and lasts 30 minutes.</p>
        <p className="muted small">Nothing arrived after a few minutes? Check your junk folder, or make sure you used the email address you listed with.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="form">
      <label htmlFor="login-email">Email address you listed with
        <input id="login-email" type="email" required autoComplete="email" value={email}
          onChange={(e) => setEmail(e.target.value)} placeholder="name@company.co.uk" />
      </label>
      {error && <p className="err">{error}</p>}
      <button type="submit" className="primary" disabled={busy}>{busy ? 'Sending...' : 'Email me a login link'}</button>
    </form>
  );
}
