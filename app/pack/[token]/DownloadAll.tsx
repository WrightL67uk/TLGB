'use client';

import { useState } from 'react';
import { makeZip } from '@/lib/zip';

/** Fetches every document and saves them as one zip, built in the browser. */
export default function DownloadAll({ token, count }: { token: string; count: number }) {
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle');
  const [progress, setProgress] = useState('');

  async function run() {
    setState('busy');
    setProgress('Preparing…');
    try {
      const res = await fetch(`/api/pack/${encodeURIComponent(token)}/all`, { method: 'POST' });
      const out = await res.json();
      if (!out.ok) throw new Error(out.error);
      const files: { name: string; data: Uint8Array }[] = [];
      for (const [i, f] of (out.files as { name: string; url: string }[]).entries()) {
        setProgress(`Downloading ${i + 1} of ${out.files.length}…`);
        const r = await fetch(f.url);
        if (!r.ok) throw new Error('A document could not be downloaded.');
        files.push({ name: f.name, data: new Uint8Array(await r.arrayBuffer()) });
      }
      const blob = makeZip(files);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = out.zipName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
      setState('idle');
      setProgress('');
    } catch (e) {
      setState('error');
      setProgress(e instanceof Error && e.message ? e.message : 'Download failed. Try again, or download the documents one by one.');
    }
  }

  return (
    <div className="pk-all">
      <button type="button" className="primary" onClick={run} disabled={state === 'busy' || count === 0}>
        {state === 'busy' ? 'Preparing zip…' : `Download all (${count})`}
      </button>
      {progress && <span className={state === 'error' ? 'err small' : 'muted small'} role="status">{progress}</span>}
    </div>
  );
}
