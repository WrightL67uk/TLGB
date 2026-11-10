'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function PasswordForm({ back }: { back: string }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('The two passwords do not match.'); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/set-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, confirm }) });
      const json = await res.json();
      if (json.ok) setDone(true);
      else setError(json.error ?? 'Something went wrong. Try again.');
    } catch {
      setError('Could not connect. Check your internet and try again.');
    } finally {
      setBusy(false);
    }
  }

  if (done) return <div className="ok-box"><p><strong>Password saved.</strong> Next time, log in with your email and this password.</p><p><Link href={back}>Back to your account</Link></p></div>;

  return (
    <form onSubmit={onSubmit} className="form">
      <label>New password
        <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <span className="hint">At least 8 characters.</span>
      </label>
      <label>Type it again
        <input type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </label>
      {error && <p className="err">{error}</p>}
      <button type="submit" className="primary" disabled={busy}>{busy ? 'Saving...' : 'Save password'}</button>
    </form>
  );
}
