'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { uploadToSignedUrl } from '@/lib/supabaseBrowser';

type F = { id: string; file_name: string; size_bytes: number };

const size = (n: number) => (n > 1_048_576 ? `${(n / 1_048_576).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`);

async function call(body: unknown) {
  const res = await fetch('/api/contractor/files', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({ ok: false, error: 'Something went wrong.' }));
  if (!j.ok) throw new Error(j.error ?? 'Something went wrong.');
  return j;
}

/** Upload and remove drawings on a job. */
export default function JobFiles({ jobId, files }: { jobId: string; files: F[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function onPick(list: FileList | null) {
    if (!list?.length) return;
    setError('');
    try {
      for (const file of Array.from(list)) {
        setBusy(`Uploading ${file.name}...`);
        const prep = await call({ op: 'prepare', jobId, name: file.name, size: file.size });
        await uploadToSignedUrl(prep.signedUrl, file);
        await call({ op: 'save', jobId, path: prep.path, name: file.name, type: file.type, size: file.size });
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy('');
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Remove this file from the job?')) return;
    setBusy('Removing...');
    try {
      await call({ op: 'delete', jobId, fileId: id });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove.');
    } finally {
      setBusy('');
    }
  }

  return (
    <div>
      {files.length > 0 && (
        <ul className="ct-files">
          {files.map((f) => (
            <li key={f.id}>
              <a href={`/api/jobs/file/${f.id}`}>{f.file_name}</a> <span className="muted small">{size(f.size_bytes)}</span>
              <button type="button" className="ct-btn" onClick={() => remove(f.id)} disabled={!!busy}>remove</button>
            </li>
          ))}
        </ul>
      )}
      <label className="ct-btn" style={{ cursor: busy ? 'wait' : 'pointer' }}>
        {busy || 'Upload drawings or documents'}
        <input type="file" multiple hidden disabled={!!busy} onChange={(e) => { onPick(e.target.files); e.target.value = ''; }}
          accept=".pdf,.jpg,.jpeg,.png,.zip,.xlsx,.xls,.csv,.docx,.doc,.dwg,.dxf" />
      </label>
      <p className="muted small" style={{ margin: '6px 0 0' }}>PDF, images, Word, Excel, ZIP or CAD, up to 25MB each. Only members who can see the job can download them.</p>
      {error && <p className="err">{error}</p>}
    </div>
  );
}
