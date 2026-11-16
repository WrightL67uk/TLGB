'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadToSignedUrl } from '@/lib/supabaseBrowser';
import {
  SOIL_PRODUCTS, SOIL_SOURCES, SOIL_FREQ, SOIL_TESTS, SOIL_TICKET_FIELDS, SOIL_LOADS, DOC_KINDS, docKindLabel, type Soil,
} from '@/lib/soil';

type Doc = { id: string; kind: string; title: string; tested_on: string; file_name: string };
async function post(body: unknown) {
  const r = await fetch('/api/supplier/soil', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
}
const STATUS: Record<string, string> = {
  none: 'Not sent for checking yet', pending: 'Waiting for us to check it', approved: 'Checked and showing on your listing', rejected: 'Not approved',
};

export default function SoilForm({ supplierId, status, note, initial, docs }: { supplierId: string; status: string; note: string | null; initial: Soil; docs: Doc[] }) {
  const router = useRouter();
  const [f, setF] = useState<Soil>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [kind, setKind] = useState('stockpile-test');
  const [title, setTitle] = useState('');
  const [testedOn, setTestedOn] = useState('');
  const set = <K extends keyof Soil>(k: K, v: Soil[K]) => setF((x) => ({ ...x, [k]: v }));
  const toggle = (k: 'products' | 'sources' | 'tests' | 'ticket_fields' | 'loads', v: string) =>
    setF((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((i) => i !== v) : [...x[k], v] }));

  const yn = (v: boolean | null, change: (b: boolean) => void, name: string) => (
    <div className="choice-row">
      <label className={`choice ${v === true ? 'on' : ''}`}><input type="radio" name={name} checked={v === true} onChange={() => change(true)} /><strong>Yes</strong></label>
      <label className={`choice ${v === false ? 'on' : ''}`}><input type="radio" name={name} checked={v === false} onChange={() => change(false)} /><strong>No</strong></label>
    </div>
  );
  const pick = (value: string, options: { key: string; label: string }[], change: (v: string) => void, name: string) => (
    <div className="choice-row" style={{ flexWrap: 'wrap' }}>
      {options.map((o) => (
        <label key={o.key} className={`choice ${value === o.key ? 'on' : ''}`}><input type="radio" name={name} checked={value === o.key} onChange={() => change(o.key)} />{o.label}</label>
      ))}
    </div>
  );
  const checks = (k: 'products' | 'sources' | 'tests' | 'ticket_fields' | 'loads', options: { key: string; label: string }[]) => (
    <div className="checks">{options.map((o) => <label key={o.key}><input type="checkbox" checked={f[k].includes(o.key)} onChange={() => toggle(k, o.key)} /> {o.label}</label>)}</div>
  );

  async function upload(files: File[], input: HTMLInputElement) {
    if (!files.length) return;
    setBusy('upload'); setMsg(null);
    try {
      for (const file of files) {
        const prep = await post({ action: 'sign', supplierId, file: { name: file.name, type: file.type, size: file.size } });
        if (!prep.ok) throw new Error(prep.error);
        await uploadToSignedUrl(prep.signedUrl, file);
        const done = await post({ action: 'register', supplierId, path: prep.path, name: file.name, kind, title, tested_on: testedOn });
        if (!done.ok) throw new Error(done.error);
      }
      input.value = ''; setTitle(''); setTestedOn('');
      setMsg({ kind: 'ok', text: 'File added.' });
      router.refresh();
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Upload failed. Try again.' });
    } finally { setBusy(null); }
  }

  async function removeDoc(docId: string) {
    setBusy('del'); setMsg(null);
    const r = await post({ action: 'delete', supplierId, docId });
    setBusy(null);
    if (!r.ok) return setMsg({ kind: 'err', text: r.error ?? 'Could not delete.' });
    router.refresh();
  }

  async function save(submit: boolean) {
    setBusy(submit ? 'submit' : 'save'); setMsg(null);
    const r = await post({ action: 'save', supplierId, submit, soil: f });
    setBusy(null);
    if (!r.ok) { setMsg({ kind: 'err', text: r.error ?? 'Something went wrong.' }); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setMsg({ kind: 'ok', text: r.submitted ? 'Sent. We will check your answers and certificates and email you.' : 'Saved.' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    router.refresh();
  }

  return (
    <form className="res-form" onSubmit={(e) => { e.preventDefault(); void save(true); }}>
      <p className="panel" style={{ margin: 0 }}>
        <strong>{STATUS[status] ?? status}</strong>
        {status === 'rejected' && note && <><br /><span className="err">{note}</span></>}
        {status === 'approved' && <><br /><span className="muted small">If you change your answers or files, we check them again before buyers see the changes.</span></>}
      </p>
      {msg && <p className={msg.kind === 'ok' ? 'ok-box' : 'err big'}>{msg.text}</p>}

      <h2 style={{ margin: 0 }}>What soil do you supply?</h2>
      {checks('products', SOIL_PRODUCTS)}

      <h2 style={{ margin: '12px 0 0' }}>British Standards</h2>
      <div><strong>Is your topsoil certified to BS 3882?</strong>
        {pick(f.bs3882, [{ key: 'yes', label: 'Yes, all of it' }, { key: 'some', label: 'Some of it' }, { key: 'no', label: 'No' }, { key: 'na', label: 'We do not supply topsoil' }], (v) => set('bs3882', v as Soil['bs3882']), 'bs3882')}
      </div>
      <div><strong>Is your subsoil to BS 8601?</strong>
        {pick(f.bs8601, [{ key: 'yes', label: 'Yes, all of it' }, { key: 'some', label: 'Some of it' }, { key: 'no', label: 'No' }, { key: 'na', label: 'We do not supply subsoil' }], (v) => set('bs8601', v as Soil['bs8601']), 'bs8601')}
      </div>

      <h2 style={{ margin: '12px 0 0' }}>Where it comes from</h2>
      {checks('sources', SOIL_SOURCES)}
      <label>Tell us more (optional)<input value={f.source_note} onChange={(e) => set('source_note', e.target.value)} maxLength={300} placeholder="e.g. stripped from development sites in Hertfordshire and Essex" /></label>

      <h2 style={{ margin: '12px 0 0' }}>Stockpile testing</h2>
      <div><strong>How often is your soil tested?</strong>{pick(f.test_freq, SOIL_FREQ, (v) => set('test_freq', v), 'freq')}</div>
      <div className="row">
        <label>Which laboratory tests it?<input value={f.lab} onChange={(e) => set('lab', e.target.value)} maxLength={120} placeholder="e.g. Tamar Laboratories" /></label>
        <div><strong>Is the laboratory UKAS accredited?</strong>{yn(f.ukas, (b) => set('ukas', b), 'ukas')}</div>
      </div>
      <div><strong>What do the tests cover?</strong>{checks('tests', SOIL_TESTS)}</div>

      <h2 style={{ margin: '12px 0 0' }}>Delivery tickets and certificates</h2>
      <div><strong>Do you issue a delivery ticket with every load?</strong>{yn(f.tickets, (b) => set('tickets', b), 'tickets')}</div>
      {f.tickets && <div><strong>What is on the ticket?</strong>{checks('ticket_fields', SOIL_TICKET_FIELDS)}</div>}
      <div><strong>Do buyers get a test certificate with their order?</strong>
        {pick(f.cert_with_order, [{ key: 'always', label: 'Yes, with every order' }, { key: 'request', label: 'On request' }, { key: 'no', label: 'No' }], (v) => set('cert_with_order', v as Soil['cert_with_order']), 'cert')}
      </div>
      <div><strong>Can each load be traced back to the stockpile and test result it came from?</strong>{yn(f.batch_traceable, (b) => set('batch_traceable', b), 'trace')}</div>

      <h2 style={{ margin: '12px 0 0' }}>Contamination, weeds and permits</h2>
      <div><strong>Do you screen for invasive weeds such as Japanese knotweed, giant hogweed and Himalayan balsam?</strong>{yn(f.weeds, (b) => set('weeds', b), 'weeds')}</div>
      <div className="row">
        <label>Environmental permit or exemption (if you handle recycled soil)<input value={f.permit_ref} onChange={(e) => set('permit_ref', e.target.value)} maxLength={120} placeholder="Permit or exemption number" /></label>
        <label>Waste carrier registration number<input value={f.carrier_ref} onChange={(e) => set('carrier_ref', e.target.value)} maxLength={60} placeholder="e.g. CBDU123456" /></label>
      </div>

      <h2 style={{ margin: '12px 0 0' }}>Supply</h2>
      <div><strong>Load sizes you deliver</strong>{checks('loads', SOIL_LOADS)}</div>
      <label>Usual lead time (optional)<input value={f.lead_time} onChange={(e) => set('lead_time', e.target.value)} maxLength={120} placeholder="e.g. next day for stock lines, a week for blends" /></label>
      <div><strong>Can customers visit to inspect and sample the stockpiles?</strong>{yn(f.inspect, (b) => set('inspect', b), 'inspect')}</div>
      <label>Anything else buyers should know (optional)<textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} maxLength={600} rows={3} /></label>

      <h2 style={{ margin: '12px 0 0' }}>Upload your test results</h2>
      <p className="hint" style={{ margin: 0 }}>We need to see recent stockpile or batch test results, and your BS 3882 certificate if you have one. PDF, JPG or PNG, up to 10MB each. Only our admin team can open these files.</p>
      {docs.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {docs.map((d) => (
            <li key={d.id}>
              {docKindLabel(d.kind)}{d.title ? `: ${d.title}` : ''}{d.tested_on ? `, tested ${new Date(d.tested_on).toLocaleDateString('en-GB')}` : ''} <span className="muted small">({d.file_name})</span>{' '}
              <button type="button" className="linkish small" disabled={busy === 'del'} onClick={() => void removeDoc(d.id)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
      <div className="panel" style={{ margin: 0 }}>
        <div className="row">
          <label>What is it?<select value={kind} onChange={(e) => setKind(e.target.value)}>{DOC_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}</select></label>
          <label>Date tested (if shown on it)<input type="date" value={testedOn} onChange={(e) => setTestedOn(e.target.value)} /></label>
        </div>
        <label>Which stockpile or product (optional)<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Stockpile 4, multipurpose topsoil" /></label>
        <input type="file" multiple accept="application/pdf,image/jpeg,image/png" disabled={busy === 'upload'} onChange={(e) => void upload(Array.from(e.target.files ?? []), e.target)} />
        {busy === 'upload' && <span className="hint"> Uploading...</span>}
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" disabled={!!busy} onClick={() => void save(false)}>{busy === 'save' ? 'Saving...' : 'Save and finish later'}</button>
        <button type="submit" className="primary" disabled={!!busy}>{busy === 'submit' ? 'Sending...' : status === 'approved' ? 'Save and send for re-check' : 'Send for checking'}</button>
      </div>
      <p className="muted small">The details you give are shown to buyers as stated by you. We check the test certificates, but buyers should always ask for the certificate for the batch they are buying.</p>
    </form>
  );
}
