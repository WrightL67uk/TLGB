'use client';
import { useRef, useState } from 'react';

/**
 * Sends the profile form in the background so that a mistake (an unknown postcode, a pay
 * range the wrong way round) shows a message without clearing everything typed in.
 */
export default function SeekerForm({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const fd = new FormData(e.currentTarget);
    if (submitter?.name) fd.set(submitter.name, submitter.value);
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/seeker/save', { method: 'POST', body: fd, headers: { accept: 'application/json' } });
      const out = await res.json().catch(() => ({ ok: false, error: 'Something went wrong. Please try again.' }));
      if (out.ok) { window.location.href = out.next; return; }
      setError(out.error || 'Something went wrong. Please try again.');
      top.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch {
      setError('Could not save. Check your connection and try again.');
    }
    setBusy(false);
  }

  return (
    <form method="post" action="/api/seeker/save" className="wk-form" onSubmit={onSubmit} aria-busy={busy}>
      <div ref={top}>{error && <p className="err big" role="alert">{error} Nothing you typed has been lost.</p>}</div>
      {children}
      {busy && <p className="muted small" style={{ margin: 0 }}>Saving...</p>}
    </form>
  );
}
