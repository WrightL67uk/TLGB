'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/** "Need support?" button on every page. Opens a small message window; the message is emailed to the team. */
export default function SupportWidget({ who }: { who: string | null }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [hp, setHp] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Admin has its own tools, and the contact page is already a message form
  if (path.startsWith('/admin') || path === '/contact') return null;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set('name', name); fd.set('email', email); fd.set('message', message);
      fd.set('company_url', hp); fd.set('page', path);
      if (who) fd.set('who', who);
      const res = await fetch('/api/contact', { method: 'POST', headers: { 'x-tlgb-fetch': '1' }, body: fd });
      const json = await res.json().catch(() => null);
      if (json?.ok) { setSent(true); setMessage(''); }
      else setError(json?.error ?? 'Something went wrong. Please try again.');
    } catch {
      setError('Could not connect. Check your internet and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sup">
      {open && (
        <div className="sup-panel" role="dialog" aria-label="Contact support">
          <div className="sup-head">
            <strong>Need support?</strong>
            <button type="button" className="sup-x" aria-label="Close" onClick={() => setOpen(false)}>&times;</button>
          </div>
          {sent ? (
            <div className="sup-body">
              <p><strong>Thanks, your message has gone.</strong></p>
              <p>We will be in touch as soon as we can. We have emailed you a copy.</p>
              <button type="button" className="sup-send" onClick={() => { setSent(false); setOpen(false); }}>Close</button>
            </div>
          ) : (
            <form className="sup-body" onSubmit={send}>
              <p className="sup-intro">Tell us what you need help with and we will be in touch as soon as we can.</p>
              <label>Your name<input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} autoComplete="name" /></label>
              <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={200} autoComplete="email" /></label>
              <label>How can we help?<textarea value={message} onChange={(e) => setMessage(e.target.value)} required minLength={5} maxLength={3000} rows={4} /></label>
              <label className="hp" aria-hidden="true">Leave this empty<input value={hp} onChange={(e) => setHp(e.target.value)} tabIndex={-1} autoComplete="off" /></label>
              {error && <p className="sup-err" role="alert">{error}</p>}
              <button type="submit" className="sup-send" disabled={busy}>{busy ? 'Sending...' : 'Send message'}</button>
            </form>
          )}
        </div>
      )}
      <button type="button" className="sup-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>Need support?</button>
    </div>
  );
}
