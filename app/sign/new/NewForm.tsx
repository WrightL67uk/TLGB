'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type S = { name: string; email: string };

export default function NewForm({ me }: { me: string }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [signers, setSigners] = useState<S[]>([{ name: '', email: '' }, { name: '', email: '' }]);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (i: number, k: keyof S, v: string) => setSigners((s) => s.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) return setError('Choose the PDF you want signed.');
    if (!agree) return setError('Please tick the box to confirm.');
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set('file', file); fd.set('title', title); fd.set('message', message);
      fd.set('signers', JSON.stringify(signers.filter((s) => s.name.trim() || s.email.trim())));
      const res = await fetch('/api/sign/create', { method: 'POST', body: fd });
      const json = await res.json().catch(() => null);
      if (json?.ok) router.push(`/sign/${json.id}?msg=${encodeURIComponent('Sent. Each signer has been emailed.')}`);
      else setError(json?.error ?? 'Something went wrong. Please try again.');
    } catch {
      setError('Could not connect. Check your internet and try again.');
    } finally { setBusy(false); }
  }

  return (
    <form className="form" onSubmit={submit}>
      <label>Document title<input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={160} placeholder="e.g. Garden landscaping agreement, 12 Elm Road" /></label>
      <label>PDF to sign<input type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required /></label>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 600, marginBottom: 8 }}>Who needs to sign?</legend>
        {signers.map((s, i) => (
          <div className="sign-signer" key={i}>
            <input value={s.name} onChange={(e) => set(i, 'name', e.target.value)} placeholder="Full name" maxLength={120} aria-label={`Signer ${i + 1} name`} />
            <input type="email" value={s.email} onChange={(e) => set(i, 'email', e.target.value)} placeholder="Email address" maxLength={200} aria-label={`Signer ${i + 1} email`} />
            {signers.length > 1 && <button type="button" onClick={() => setSigners((x) => x.filter((_, j) => j !== i))} aria-label="Remove signer">Remove</button>}
          </div>
        ))}
        <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {signers.length < 6 && <button type="button" onClick={() => setSigners((x) => [...x, { name: '', email: '' }])}>Add another signer</button>}
          {!signers.some((s) => s.email.toLowerCase() === me) && signers.length < 6 && <button type="button" onClick={() => setSigners((x) => [...x.filter((s) => s.name || s.email), { name: '', email: me }])}>Add me as a signer</button>}
        </p>
        <p className="muted small">Everyone signs in their own time, in any order.</p>
      </fieldset>
      <label>Message to signers (optional)<textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={1500} placeholder="e.g. Please check the price on page 2 before signing." /></label>
      <label className="check"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I understand that TLGB only runs the signing. It does not write or check this document, gives no legal advice about it and is not a party to it. I have the right to send it.</label>
      {error && <p className="err" role="alert">{error}</p>}
      <button className="primary" type="submit" disabled={busy}>{busy ? 'Sending...' : 'Send for signing'}</button>
    </form>
  );
}
