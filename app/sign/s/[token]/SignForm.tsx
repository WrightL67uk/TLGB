'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignForm({ token, defaultName }: { token: string; defaultName: string }) {
  const router = useRouter();
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [mode, setMode] = useState<'type' | 'draw'>('type');
  const [name, setName] = useState(defaultName);
  const [drawn, setDrawn] = useState(false);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    const c = canvas.current;
    if (!c || mode !== 'draw') return;
    const r = window.devicePixelRatio || 1;
    c.width = c.clientWidth * r; c.height = c.clientHeight * r;
    const x = c.getContext('2d')!;
    x.scale(r, r); x.lineWidth = 2.2; x.lineCap = 'round'; x.strokeStyle = '#111';
    const pos = (e: PointerEvent) => { const b = c.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
    const down = (e: PointerEvent) => { drawing.current = true; c.setPointerCapture(e.pointerId); const [px, py] = pos(e); x.beginPath(); x.moveTo(px, py); };
    const move = (e: PointerEvent) => { if (!drawing.current) return; const [px, py] = pos(e); x.lineTo(px, py); x.stroke(); setDrawn(true); };
    const up = () => { drawing.current = false; };
    c.addEventListener('pointerdown', down); c.addEventListener('pointermove', move); c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    return () => { c.removeEventListener('pointerdown', down); c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', up); c.removeEventListener('pointercancel', up); };
  }, [mode]);

  function clear() {
    const c = canvas.current; if (!c) return;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height); setDrawn(false);
  }

  function typedPng() {
    const c = document.createElement('canvas'); c.width = 900; c.height = 220;
    const x = c.getContext('2d')!;
    x.fillStyle = '#111'; x.font = '110px "Brush Script MT","Segoe Script","Snell Roundhand",cursive'; x.textBaseline = 'middle';
    let size = 110;
    while (x.measureText(name).width > 860 && size > 30) { size -= 6; x.font = `${size}px "Brush Script MT","Segoe Script","Snell Roundhand",cursive`; }
    x.fillText(name, 20, 110);
    return c.toDataURL('image/png');
  }

  async function post(payload: Record<string, unknown>) {
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/sign/sign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, ...payload }) });
      const json = await res.json().catch(() => null);
      if (json?.ok) router.refresh(); else setError(json?.error ?? 'Something went wrong. Please try again.');
    } catch { setError('Could not connect. Check your internet and try again.'); }
    finally { setBusy(false); }
  }

  function sign(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setError('Please type your full name.');
    if (mode === 'draw' && !drawn) return setError('Please draw your signature, or switch to typing it.');
    if (!agree) return setError('Please tick the box to confirm.');
    const png = mode === 'draw' ? canvas.current!.toDataURL('image/png') : typedPng();
    post({ action: 'sign', signature: png, signedName: name.trim(), agree });
  }

  return (
    <form className="form panel" onSubmit={sign} style={{ marginTop: 16 }}>
      <h2 style={{ marginTop: 0 }}>Sign</h2>
      <label>Your full name<input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required autoComplete="name" /></label>
      <div>
        <div className="sign-tabs">
          <button type="button" className={mode === 'type' ? 'on' : ''} onClick={() => setMode('type')}>Type it</button>
          <button type="button" className={mode === 'draw' ? 'on' : ''} onClick={() => setMode('draw')}>Draw it</button>
        </div>
        {mode === 'type'
          ? <div className="sign-typed" aria-label="Signature preview">{name}</div>
          : <><canvas ref={canvas} className="sign-sig" aria-label="Draw your signature here" /><button type="button" onClick={clear} style={{ marginTop: 6 }}>Clear</button></>}
      </div>
      <label className="check"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I have read the document and I agree to sign it electronically. I understand this has the same effect as signing on paper.</label>
      {error && <p className="err" role="alert">{error}</p>}
      <button className="primary" type="submit" disabled={busy}>{busy ? 'Signing...' : 'Sign document'}</button>
      <p className="small"><button type="button" onClick={() => setDeclining((d) => !d)} style={{ background: 'none', border: 0, color: 'inherit', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>I do not want to sign this</button></p>
      {declining && (
        <div>
          <label>Reason (optional, the sender will see it)<textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={1000} /></label>
          <button type="button" className="danger" disabled={busy} onClick={() => post({ action: 'decline', reason })}>Decline to sign</button>
        </div>
      )}
    </form>
  );
}
