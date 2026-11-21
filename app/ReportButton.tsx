'use client';

import { useEffect, useState } from 'react';
import { REPORT_REASONS } from '@/lib/report';

/** "Report this business" button on public profiles. Opens a small message window; goes to the team only. */
export default function ReportButton({ kind, id, name }: { kind: 'trade' | 'supplier'; id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0].key);
  const [message, setMessage] = useState('');
  const [who, setWho] = useState('');
  const [email, setEmail] = useState('');
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

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const fd = new FormData();
      fd.set('kind', kind); fd.set('id', id); fd.set('reason', reason); fd.set('message', message);
      fd.set('name', who); fd.set('email', email); fd.set('company_url', hp);
      const res = await fetch('/api/report', { method: 'POST', body: fd });
      const json = await res.json().catch(() => null);
      if (json?.ok) setSent(true); else setError(json?.error ?? 'Something went wrong. Please try again.');
    } catch {
      setError('Could not connect. Check your internet and try again.');
    } finally { setBusy(false); }
  }

  return (
    <>
      <button type="button" className="report-btn" onClick={() => { setSent(false); setOpen(true); }}>Report this business</button>
      {open && (
        <div className="report-back" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="sup-panel report-panel" role="dialog" aria-label={`Report ${name}`}>
            <div className="sup-head">
              <strong>Report {name}</strong>
              <button type="button" className="sup-x" aria-label="Close" onClick={() => setOpen(false)}>&times;</button>
            </div>
            {sent ? (
              <div className="sup-body">
                <p><strong>Report sent.</strong></p>
                <p>We will look into it and email you if we need more. We have emailed you a receipt.</p>
                <button type="button" className="sup-send" onClick={() => setOpen(false)}>Close</button>
              </div>
            ) : (
              <form className="sup-body" onSubmit={send}>
                <p className="sup-intro">Tell us what is wrong. We check every report, and the business is not told who sent it.</p>
                <label>What is the problem?
                  <select value={reason} onChange={(e) => setReason(e.target.value)}>
                    {REPORT_REASONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                  </select>
                </label>
                <label>What happened?<textarea value={message} onChange={(e) => setMessage(e.target.value)} required minLength={10} maxLength={3000} rows={4} placeholder="Give dates, site names, or anything we can check" /></label>
                <label>Your name<input value={who} onChange={(e) => setWho(e.target.value)} required maxLength={120} autoComplete="name" /></label>
                <label>Your email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={200} autoComplete="email" /></label>
                <label className="hp" aria-hidden="true">Leave this empty<input value={hp} onChange={(e) => setHp(e.target.value)} tabIndex={-1} autoComplete="off" /></label>
                <p className="muted small">Only the TLGB team sees this. We may email you for more detail.</p>
                {error && <p className="sup-err" role="alert">{error}</p>}
                <button type="submit" className="sup-send" disabled={busy}>{busy ? 'Sending...' : 'Send report'}</button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
