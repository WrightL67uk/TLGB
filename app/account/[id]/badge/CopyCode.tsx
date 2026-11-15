'use client';
import { useState } from 'react';

export default function CopyCode({ code }: { code: string }) {
  const [done, setDone] = useState(false);
  return (
    <div>
      <textarea readOnly value={code} rows={5} style={{ width: '100%', fontFamily: 'monospace', fontSize: '.85rem' }} onFocus={(e) => e.currentTarget.select()} />
      <button type="button" className="primary" onClick={async () => { try { await navigator.clipboard.writeText(code); setDone(true); } catch { setDone(false); } }}>
        {done ? 'Copied' : 'Copy the code'}
      </button>
    </div>
  );
}
