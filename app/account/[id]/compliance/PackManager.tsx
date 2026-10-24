'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadToSignedUrl } from '@/lib/supabaseBrowser';
import {
  CATEGORIES, SHARE_EXTRAS, DOC_TYPES, CORE_COUNT, ACCREDITATION_SUGGESTIONS, PACK_MAX_FILE_BYTES, PACK_MIME,
  docType, shownStatus, ukDate, fileSize, type DocType, type DocStatus,
} from '@/lib/complianceTypes';

type Doc = {
  id: string; doc_type: string; title: string; file_name: string; size: number;
  expiry: string | null; reviewed_on: string | null; status: DocStatus; reject_reason: string | null;
  replaces: string | null; created_at: string;
};
type LinkRow = {
  id: string; label: string; url: string; include: string[]; expires_at: string | null;
  revoked_at: string | null; open_count: number; created_at: string;
};
type Event = { when: string; link: string; what: string };
type Editing = { type: DocType; replaces: Doc | null } | null;

const today = () => new Date().toISOString().slice(0, 10);
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const out = await res.json().catch(() => ({ ok: false, error: 'Something went wrong. Try again.' }));
  if (!out.ok) throw new Error(out.error || 'Something went wrong. Try again.');
  return out;
}

async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

export default function PackManager({ businessId, tradingName, docs, links, events }: {
  businessId: string; tradingName: string; docs: Doc[]; links: LinkRow[]; events: Event[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing>(null);
  const [sharing, setSharing] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const live = docs.filter((d) => d.status === 'checked' || d.status === 'provided');
  const filled = DOC_TYPES.filter((t) => t.core && docs.some((d) => d.doc_type === t.key && d.status !== 'rejected')).length;
  const lastUpdated = docs.reduce((m, d) => (d.created_at > m ? d.created_at : m), '');

  async function remove(d: Doc) {
    if (!window.confirm(`Delete "${d.title}" from your pack? Contractors will no longer see it.`)) return;
    try {
      await post('/api/compliance/delete', { businessId, docId: d.id });
      setMsg({ ok: true, text: `Deleted ${d.title}.` });
      router.refresh();
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  }

  return (
    <>
      <div className="cp-head">
        <div>
          <h1>Compliance pack</h1>
          <p className="muted">{tradingName} · {filled} of {CORE_COUNT} documents added{lastUpdated && <> · last updated {ukDate(lastUpdated.slice(0, 10))}</>}</p>
        </div>
        <button type="button" className="primary" onClick={() => { setSharing(true); setEditing(null); setTimeout(() => document.getElementById('share')?.scrollIntoView({ behavior: 'smooth' }), 50); }}>Share pack</button>
      </div>
      <div className="cp-meter" role="progressbar" aria-valuemin={0} aria-valuemax={CORE_COUNT} aria-valuenow={filled}><b style={{ width: `${Math.round((filled / CORE_COUNT) * 100)}%` }} /></div>
      <p className="muted small">Insurance and accreditations are checked by us before contractors see them, usually within one working day. Everything else goes live as soon as you upload it.</p>
      {msg && <p className={msg.ok ? 'ok-box' : 'err big'} role="status">{msg.text}</p>}

      {CATEGORIES.map((c) => (
        <section key={c.key} className="cp-group">
          <h2>{c.label}</h2>
          {DOC_TYPES.filter((t) => t.category === c.key).map((t) => (
            <Slot key={t.key} t={t} docs={docs.filter((d) => d.doc_type === t.key)} businessId={businessId}
              editing={editing} setEditing={(e) => { setEditing(e); setMsg(null); }} onRemove={remove}
              onSaved={(text) => { setEditing(null); setMsg({ ok: true, text }); router.refresh(); }} />
          ))}
        </section>
      ))}

      <section id="share" className="cp-group">
        <h2>Share links</h2>
        {sharing
          ? <ShareForm businessId={businessId} live={live} onDone={() => { setSharing(false); router.refresh(); }} />
          : <button type="button" className="primary" onClick={() => setSharing(true)}>Create a share link</button>}
        <Links businessId={businessId} links={links} onChange={() => router.refresh()} />
      </section>

      <section className="cp-group">
        <h2>Who has looked</h2>
        {events.length === 0 ? <p className="muted">Nobody has opened your pack yet. When they do, you will see it here.</p> : (
          <div className="cp-table-wrap">
            <table className="cp-table">
              <thead><tr><th>When</th><th>Link</th><th>What happened</th></tr></thead>
              <tbody>{events.map((e, i) => <tr key={i}><td>{when(e.when)}</td><td>{e.link}</td><td>{e.what}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function Pill({ d }: { d: Doc }) {
  const s = shownStatus(d);
  return <span className={`cp-pill p-${s.key}`}>{s.label}</span>;
}

function meta(d: Doc) {
  const date = d.expiry ? `Expires ${ukDate(d.expiry)}` : d.reviewed_on ? `Reviewed ${ukDate(d.reviewed_on)}` : '';
  return [date, `${d.file_name} (${fileSize(d.size)})`].filter(Boolean).join(' · ');
}

function Slot({ t, docs, businessId, editing, setEditing, onRemove, onSaved }: {
  t: DocType; docs: Doc[]; businessId: string; editing: Editing;
  setEditing: (e: Editing) => void; onRemove: (d: Doc) => void; onSaved: (text: string) => void;
}) {
  // Live documents, with any replacement waiting for a check shown underneath
  const mains = docs.filter((d) => !(d.replaces && docs.some((x) => x.id === d.replaces)));
  const childOf = (d: Doc) => docs.filter((x) => x.replaces === d.id);
  const isEditing = (r: Doc | null) => editing?.type.key === t.key && (editing.replaces?.id ?? null) === (r?.id ?? null);

  return (
    <div className="cp-slot">
      {mains.length === 0 && (
        <div className="cp-row missing">
          <div className="cp-doc"><strong>{t.label}</strong><span>{t.hint ?? 'Not added yet'}</span></div>
          <span className="cp-pill p-missing">Missing</span>
          <div className="cp-actions">
            <button type="button" className="cp-btn green" onClick={() => setEditing({ type: t, replaces: null })}>Add</button>
            {t.template && <a className="cp-btn" href={`/api/templates/${t.template}`}>Use our template</a>}
          </div>
        </div>
      )}
      {mains.map((d) => (
        <div key={d.id}>
          <div className={`cp-row st-${shownStatus(d).key}`}>
            <div className="cp-doc"><strong>{d.title}</strong><span>{meta(d)}</span>
              {d.status === 'rejected' && d.reject_reason && <span className="cp-reason">Not accepted: {d.reject_reason}</span>}
            </div>
            <Pill d={d} />
            <div className="cp-actions">
              <a className="cp-btn" href={`/api/compliance/file/${d.id}`} target="_blank" rel="noopener">View</a>
              {d.status !== 'pending' && d.status !== 'rejected' && <button type="button" className="cp-btn" onClick={() => setEditing({ type: t, replaces: d })}>Replace</button>}
              <button type="button" className="cp-btn quiet" onClick={() => onRemove(d)}>Delete</button>
            </div>
          </div>
          {childOf(d).map((c) => (
            <div key={c.id} className={`cp-row cp-child st-${shownStatus(c).key}`}>
              <div className="cp-doc"><strong>New version</strong><span>{meta(c)}</span>
                {c.status === 'rejected' && c.reject_reason && <span className="cp-reason">Not accepted: {c.reject_reason}. The version above is still live.</span>}
                {c.status === 'pending' && <span>The version above stays live until we have checked this one.</span>}
              </div>
              <Pill d={c} />
              <div className="cp-actions">
                <a className="cp-btn" href={`/api/compliance/file/${c.id}`} target="_blank" rel="noopener">View</a>
                <button type="button" className="cp-btn quiet" onClick={() => onRemove(c)}>Delete</button>
              </div>
            </div>
          ))}
          {isEditing(d) && <UploadForm t={t} replaces={d} businessId={businessId} onCancel={() => setEditing(null)} onSaved={onSaved} />}
        </div>
      ))}
      {mains.length > 0 && t.multiple && !isEditing(null) && (
        <div className="cp-more">
          <button type="button" className="cp-btn" onClick={() => setEditing({ type: t, replaces: null })}>Add another {t.key === 'accreditation' ? 'accreditation' : t.label.toLowerCase()}</button>
          {t.template && <a className="cp-btn" href={`/api/templates/${t.template}`}>Use our template</a>}
        </div>
      )}
      {isEditing(null) && <UploadForm t={t} replaces={null} businessId={businessId} onCancel={() => setEditing(null)} onSaved={onSaved} />}
    </div>
  );
}

function UploadForm({ t, replaces, businessId, onCancel, onSaved }: {
  t: DocType; replaces: Doc | null; businessId: string; onCancel: () => void; onSaved: (text: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState(replaces?.title ?? (t.multiple ? '' : t.label));
  const [date, setDate] = useState(t.expires ? '' : today());
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const fid = `f-${t.key}-${replaces?.id ?? 'new'}`;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!file) return setErr('Choose a file to upload.');
    if (!PACK_MIME.includes(file.type)) return setErr('Documents must be PDF, JPG or PNG.');
    if (file.size > PACK_MAX_FILE_BYTES) return setErr('That file is over 20MB. Save it as a smaller PDF and try again.');
    if (title.trim().length < 2) return setErr('Give the document a name.');
    if (!date) return setErr(t.expires ? 'Enter the expiry date from the certificate.' : 'Enter the date you last reviewed it.');
    try {
      setBusy('Uploading…');
      const prep = await post('/api/compliance/upload-url', { businessId, docType: t.key, name: file.name, type: file.type, size: file.size });
      await uploadToSignedUrl(prep.signedUrl, file);
      setBusy('Saving…');
      const out = await post('/api/compliance/save', {
        businessId, docType: t.key, title: title.trim(), path: prep.path, name: file.name, type: file.type, size: file.size,
        expiry: t.expires ? date : null, reviewedOn: t.expires ? null : date, replaces: replaces?.id ?? null,
      });
      onSaved(out.status === 'pending'
        ? `${title.trim()} uploaded. We will check it, usually within one working day.`
        : `${title.trim()} is now in your pack.`);
    } catch (e2) {
      setErr((e2 as Error).message);
      setBusy('');
    }
  }

  const suggestions = t.key === 'accreditation' ? ACCREDITATION_SUGGESTIONS : [];
  return (
    <form className="cp-form" onSubmit={save}>
      <h3>{replaces ? `Replace ${replaces.title}` : `Add ${t.multiple ? (t.key === 'accreditation' ? 'an accreditation' : t.label.toLowerCase()) : t.label.toLowerCase()}`}</h3>
      {t.hint && <p className="hint">{t.hint}</p>}
      <label htmlFor={fid}>File (PDF, JPG or PNG, up to 20MB)
        <input id={fid} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      <label htmlFor={`${fid}-t`}>Name contractors will see
        <input id={`${fid}-t`} value={title} maxLength={120} list={suggestions.length ? `${fid}-s` : undefined}
          placeholder={t.key === 'accreditation' ? 'e.g. Constructionline Gold' : t.key === 'rams' ? 'e.g. RAMS: soft landscaping and tree planting' : t.key === 'coshh' ? 'e.g. COSHH: glyphosate herbicide' : ''}
          onChange={(e) => setTitle(e.target.value)} />
        {suggestions.length > 0 && <datalist id={`${fid}-s`}>{suggestions.map((s) => <option key={s} value={s} />)}</datalist>}
      </label>
      <label htmlFor={`${fid}-d`}>{t.expires ? 'Expiry date (from the certificate)' : 'Last reviewed'}
        <input id={`${fid}-d`} type="date" value={date} max={t.expires ? undefined : today()} onChange={(e) => setDate(e.target.value)} />
      </label>
      {t.checked && <p className="hint">We check this before contractors can see it.{replaces ? ' Your current version stays live until then.' : ''}</p>}
      {err && <p className="err">{err}</p>}
      <div className="cp-form-actions">
        <button type="submit" className="primary" disabled={!!busy}>{busy || 'Save'}</button>
        <button type="button" onClick={onCancel} disabled={!!busy}>Cancel</button>
      </div>
    </form>
  );
}

function ShareForm({ businessId, live, onDone }: { businessId: string; live: Doc[]; onDone: () => void }) {
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of live) { const c = docType(d.doc_type)?.category; if (c) m.set(c, (m.get(c) ?? 0) + 1); }
    return m;
  }, [live]);
  const [label, setLabel] = useState('');
  const [include, setInclude] = useState<string[]>([
    ...CATEGORIES.filter((c) => c.shareByDefault).map((c) => c.key as string),
    ...SHARE_EXTRAS.filter((e) => e.shareByDefault).map((e) => e.key as string),
  ]);
  const [days, setDays] = useState<string>('90');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [made, setMade] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const out = await post('/api/compliance/links', { businessId, label: label.trim(), include, days: days === 'never' ? null : Number(days) });
      setMade(out.url);
      setCopied(await copy(out.url));
    } catch (e2) { setErr((e2 as Error).message); }
    setBusy(false);
  }

  if (made) {
    return (
      <div className="cp-form">
        <h3>Your link is ready</h3>
        <div className="cp-link"><input readOnly value={made} onFocus={(e) => e.target.select()} aria-label="Share link" />
          <button type="button" onClick={async () => setCopied(await copy(made))}>{copied ? 'Copied' : 'Copy'}</button></div>
        <p className="hint">Paste it into your email, PQQ or supplier portal. It always shows the latest versions of your documents.</p>
        <div className="cp-form-actions"><button type="button" className="primary" onClick={onDone}>Done</button></div>
      </div>
    );
  }

  return (
    <form className="cp-form" onSubmit={create}>
      <h3>New share link</h3>
      <label htmlFor="share-label">Who is it for?
        <input id="share-label" value={label} maxLength={80} placeholder="e.g. Kier Construction, Hatfield supply chain" onChange={(e) => setLabel(e.target.value)} />
      </label>
      <fieldset className="cp-include">
        <legend>Include</legend>
        {CATEGORIES.map((c) => (
          <label key={c.key} className="check" htmlFor={`inc-${c.key}`}>
            <input id={`inc-${c.key}`} type="checkbox" checked={include.includes(c.key)}
              onChange={(e) => setInclude(e.target.checked ? [...include, c.key] : include.filter((k) => k !== c.key))} />
            {c.label} ({counts.get(c.key) ?? 0})
          </label>
        ))}
        {SHARE_EXTRAS.map((x) => (
          <label key={x.key} className="check" htmlFor={`inc-${x.key}`}>
            <input id={`inc-${x.key}`} type="checkbox" checked={include.includes(x.key)}
              onChange={(e) => setInclude(e.target.checked ? [...include, x.key] : include.filter((k) => k !== x.key))} />
            {x.label}
          </label>
        ))}
      </fieldset>
      <label htmlFor="share-days">Link expires
        <select id="share-days" value={days} onChange={(e) => setDays(e.target.value)}>
          <option value="30">In 30 days</option>
          <option value="90">In 90 days</option>
          <option value="180">In 6 months</option>
          <option value="365">In a year</option>
          <option value="never">Never (until you switch it off)</option>
        </select>
      </label>
      <p className="hint">Documents still waiting for our check are not shown on links until we have checked them.</p>
      {err && <p className="err">{err}</p>}
      <div className="cp-form-actions">
        <button type="submit" className="primary" disabled={busy}>{busy ? 'Creating…' : 'Create link'}</button>
        <button type="button" onClick={onDone} disabled={busy}>Cancel</button>
      </div>
    </form>
  );
}

function Links({ businessId, links, onChange }: { businessId: string; links: LinkRow[]; onChange: () => void }) {
  const [copied, setCopied] = useState('');
  const [err, setErr] = useState('');
  if (!links.length) return <p className="muted">No links yet. Make one for each contractor so you can see who opens your pack.</p>;

  async function off(l: LinkRow) {
    if (!window.confirm(`Switch off the link for ${l.label}? It stops working straight away.`)) return;
    try { await post('/api/compliance/links/revoke', { businessId, linkId: l.id }); onChange(); } catch (e) { setErr((e as Error).message); }
  }
  const state = (l: LinkRow) =>
    l.revoked_at ? 'Switched off' : l.expires_at && new Date(l.expires_at) < new Date() ? `Expired ${ukDate(l.expires_at.slice(0, 10))}` : l.expires_at ? ukDate(l.expires_at.slice(0, 10)) : 'Never';

  return (
    <div className="cp-table-wrap">
      {err && <p className="err">{err}</p>}
      <table className="cp-table">
        <thead><tr><th>For</th><th>Created</th><th>Expires</th><th>Opened</th><th></th></tr></thead>
        <tbody>
          {links.map((l) => {
            const dead = !!l.revoked_at || (!!l.expires_at && new Date(l.expires_at) < new Date());
            return (
              <tr key={l.id} className={dead ? 'dead' : ''}>
                <td><strong>{l.label}</strong></td>
                <td>{ukDate(l.created_at.slice(0, 10))}</td>
                <td>{state(l)}</td>
                <td>{l.open_count === 0 ? 'Not yet' : `${l.open_count} time${l.open_count === 1 ? '' : 's'}`}</td>
                <td className="cp-actions">
                  {!dead && <>
                    <button type="button" className="cp-btn" onClick={async () => { if (await copy(l.url)) { setCopied(l.id); setTimeout(() => setCopied(''), 2000); } else window.prompt('Copy this link', l.url); }}>{copied === l.id ? 'Copied' : 'Copy'}</button>
                    <a className="cp-btn" href={l.url} target="_blank" rel="noopener">Preview</a>
                    <button type="button" className="cp-btn quiet" onClick={() => off(l)}>Switch off</button>
                  </>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
