'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PQQ, PQQ_SECTIONS, PQQ_COUNTABLE, SHORT_LIMIT, LONG_LIMIT, isAnswered, matchQuestion,
  type Question, type Answer, type AnswerData, type Project,
} from '@/lib/pqq';
import { ukDate } from '@/lib/complianceTypes';

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const out = await res.json().catch(() => ({ ok: false, error: 'Something went wrong. Try again.' }));
  if (!out.ok) throw new Error(out.error || 'Something went wrong. Try again.');
  return out;
}

function CopyBtn({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="cp-btn" disabled={!text.trim()} onClick={async () => {
      try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }
      catch { window.prompt('Copy this answer', text); }
    }}>{done ? 'Copied' : label}</button>
  );
}

const count = (s: string) => {
  const words = s.trim() ? s.trim().split(/\s+/).length : 0;
  return `${s.length.toLocaleString('en-GB')} characters · ${words} words`;
};

function defaultYears() {
  const y = new Date().getFullYear();
  return [`${y - 1}`, `${y - 2}`, `${y - 3}`];
}

export default function PqqManager({ businessId, tradingName, answers, projects, auto }: {
  businessId: string; tradingName: string; answers: Answer[]; projects: Project[]; auto: Record<string, string>;
}) {
  const [saved, setSaved] = useState<Record<string, Answer>>(() => Object.fromEntries(answers.map((a) => [a.key, a])));
  const [open, setOpen] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const matches = useMemo(() => (search.trim().length > 8 ? matchQuestion(search) : []), [search]);
  const answered = PQQ_COUNTABLE.filter((q) => isAnswered(q, saved[q.key])).length;

  function goTo(key: string) {
    setOpen(key);
    setTimeout(() => document.getElementById(`q-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  return (
    <>
      <div className="cp-head">
        <div>
          <h1>PQQ answer bank</h1>
          <p className="muted">{tradingName} · {answered} of {PQQ_COUNTABLE.length} answers saved</p>
        </div>
        <a className="primary pq-dl" href={`/api/pqq/export?b=${businessId}`}>Download as Word</a>
      </div>
      <div className="cp-meter"><b style={{ width: `${Math.round((answered / PQQ_COUNTABLE.length) * 100)}%` }} /></div>
      <p className="muted small">The questions prequalification questionnaires and supplier portals ask again and again. Save your answer once, then copy it into any portal. Keep a short version for boxes with a character limit and a long version for everything else.</p>

      <section className="pq-search">
        <label htmlFor="pq-find"><strong>Got a question in front of you?</strong> Paste it here to find your saved answer.</label>
        <textarea id="pq-find" rows={2} value={search} placeholder="e.g. Please describe how you manage subcontractors on site" onChange={(e) => setSearch(e.target.value)} />
        {search.trim().length > 8 && (
          matches.length === 0 ? <p className="muted small">No close match. Try fewer words, or browse the sections below.</p> : (
            <ul className="pq-matches">
              {matches.map(({ q }) => {
                const a = saved[q.key];
                const text = q.type === 'auto' ? auto[q.key] ?? '' : a?.long_text || a?.short_text || '';
                return (
                  <li key={q.key}>
                    <div><strong>{q.q}</strong><span className="muted small"> {PQQ_SECTIONS.find((s) => s.key === q.section)?.label}</span></div>
                    <div className="cp-actions">
                      {a?.short_text && q.type === 'text' && <CopyBtn text={a.short_text} label="Copy short" />}
                      {text && <CopyBtn text={text} label={q.type === 'text' ? 'Copy long' : 'Copy'} />}
                      <button type="button" className="cp-btn" onClick={() => goTo(q.key)}>{isAnswered(q, a) || q.type === 'auto' ? 'Open' : 'Answer it'}</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        )}
      </section>

      <nav className="pq-nav">
        {PQQ_SECTIONS.map((s) => {
          const qs = PQQ_COUNTABLE.filter((q) => q.section === s.key);
          const done = qs.filter((q) => isAnswered(q, saved[q.key])).length;
          return <a key={s.key} href={`#sec-${s.key}`}>{s.label} <span>{done}/{qs.length}</span></a>;
        })}
        <a href="#sec-projects">Project references <span>{projects.length}</span></a>
      </nav>

      {PQQ_SECTIONS.map((s) => (
        <section key={s.key} id={`sec-${s.key}`} className="cp-group">
          <h2>{s.label}</h2>
          {PQQ.filter((q) => q.section === s.key).map((q) => (
            <QuestionCard key={q.key} q={q} a={saved[q.key]} auto={auto[q.key]} businessId={businessId}
              open={open === q.key} onToggle={() => setOpen(open === q.key ? null : q.key)}
              onSaved={(a) => setSaved({ ...saved, [q.key]: a })} />
          ))}
        </section>
      ))}

      <Projects businessId={businessId} projects={projects} />
    </>
  );
}

function preview(q: Question, a: Answer | undefined, auto?: string) {
  if (q.type === 'auto') return auto?.split('\n')[0] ?? '';
  if (!a) return '';
  if (q.type === 'yesno') return a.data?.yes == null ? '' : `${a.data.yes ? 'Yes' : 'No'}${a.short_text ? `. ${a.short_text}` : ''}`;
  if (q.type === 'figures') return isAnswered(q, a) ? `Figures for ${(a.data?.years ?? []).join(', ')}` : '';
  return a.short_text || a.long_text || '';
}

function QuestionCard({ q, a, auto, businessId, open, onToggle, onSaved }: {
  q: Question; a?: Answer; auto?: string; businessId: string; open: boolean; onToggle: () => void; onSaved: (a: Answer) => void;
}) {
  const done = q.type === 'auto' ? !!auto : isAnswered(q, a);
  const pv = preview(q, a, auto);
  return (
    <div id={`q-${q.key}`} className={`pq-card${open ? ' open' : ''}${done ? ' done' : ''}`}>
      <button type="button" className="pq-head" onClick={onToggle} aria-expanded={open}>
        <span className="pq-q">{q.q}</span>
        <span className={`cp-pill ${q.type === 'auto' ? 'p-checked' : done ? 'p-ok' : 'p-missing'}`}>
          {q.type === 'auto' ? 'Filled for you' : done ? 'Saved' : 'Not answered'}
        </span>
        {!open && pv && <span className="pq-preview">{pv.length > 160 ? `${pv.slice(0, 160)}…` : pv}</span>}
      </button>
      {open && (
        <div className="pq-body">
          {q.help && <p className="hint">{q.help}</p>}
          {q.type === 'auto'
            ? <AutoAnswer text={auto ?? ''} />
            : <Editor q={q} a={a} businessId={businessId} onSaved={onSaved} />}
        </div>
      )}
    </div>
  );
}

function AutoAnswer({ text }: { text: string }) {
  return (
    <>
      <p className="pq-auto">{text || 'Nothing to show yet.'}</p>
      <div className="cp-actions" style={{ justifyContent: 'flex-start' }}>
        <CopyBtn text={text} />
        <span className="muted small">Taken from your listing and compliance pack. Update it there and this changes too.</span>
      </div>
    </>
  );
}

function Editor({ q, a, businessId, onSaved }: { q: Question; a?: Answer; businessId: string; onSaved: (a: Answer) => void }) {
  const [short, setShort] = useState(a?.short_text ?? '');
  const [long, setLong] = useState(a?.long_text ?? '');
  const [yes, setYes] = useState<boolean | null>(a?.data?.yes ?? null);
  const [years, setYears] = useState<string[]>(a?.data?.years ?? defaultYears());
  const [values, setValues] = useState<Record<string, string[]>>(
    () => Object.fromEntries((q.rows ?? []).map((r) => [r, a?.data?.values?.[r] ?? ['', '', '']])),
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const id = `pq-${q.key}`;

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const data: AnswerData | null = q.type === 'yesno' ? { yes } : q.type === 'figures' ? { years, values } : null;
      const out = await post('/api/pqq/answer', { businessId, key: q.key, short, long: q.type === 'text' ? long : null, data });
      onSaved({ key: q.key, short_text: short || null, long_text: q.type === 'text' ? long || null : null, data, updated_at: out.updated_at });
      setMsg({ ok: true, text: 'Saved' });
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    setBusy(false);
  }

  function useStarter() {
    if (q.starter && !long.trim() && q.type === 'text') setLong(q.starter);
    if (q.type === 'text' && q.starterShort && !short.trim()) setShort(q.starterShort);
    if (q.type === 'line' && q.starter && !short.trim()) setShort(q.starter);
  }

  const figuresText = () => [['', ...years].join('\t'), ...(q.rows ?? []).map((r) => [r, ...(values[r] ?? [])].join('\t'))].join('\n');
  const yesnoText = () => (yes == null ? '' : `${yes ? 'Yes' : 'No'}.${short.trim() ? ` ${short.trim()}` : ''}`);
  const hasStarter = !!(q.starter || q.starterShort);

  return (
    <div className="pq-editor">
      {q.type === 'line' && (
        <label htmlFor={id}>Your answer
          <input id={id} value={short} maxLength={SHORT_LIMIT} onChange={(e) => setShort(e.target.value)} />
        </label>
      )}

      {q.type === 'text' && (
        <>
          <label htmlFor={`${id}-s`}>Short version <span className="muted small">for boxes with a character limit</span>
            <textarea id={`${id}-s`} rows={3} value={short} maxLength={SHORT_LIMIT} onChange={(e) => setShort(e.target.value)} />
            <span className="pq-count">{count(short)}</span>
          </label>
          <label htmlFor={`${id}-l`}>Long version
            <textarea id={`${id}-l`} rows={8} value={long} maxLength={LONG_LIMIT} onChange={(e) => setLong(e.target.value)} />
            <span className="pq-count">{count(long)}</span>
          </label>
        </>
      )}

      {q.type === 'yesno' && (
        <>
          <div className="pq-yesno" role="radiogroup" aria-label="Answer">
            <label className="check" htmlFor={`${id}-y`}><input id={`${id}-y`} type="radio" name={id} checked={yes === true} onChange={() => setYes(true)} /> Yes</label>
            <label className="check" htmlFor={`${id}-n`}><input id={`${id}-n`} type="radio" name={id} checked={yes === false} onChange={() => setYes(false)} /> No</label>
          </div>
          <label htmlFor={`${id}-d`}>Details {q.yesMeans === 'bad' ? <span className="muted small">needed if you answer yes: what happened and what you changed</span> : <span className="muted small">optional, for example when it was last reviewed</span>}
            <textarea id={`${id}-d`} rows={3} value={short} maxLength={SHORT_LIMIT} onChange={(e) => setShort(e.target.value)} />
          </label>
        </>
      )}

      {q.type === 'figures' && (
        <div className="cp-table-wrap">
          <table className="pq-fig">
            <thead><tr><th>Year ending</th>{years.map((y, i) => (
              <th key={i}><input aria-label={`Year ${i + 1}`} value={y} maxLength={20} onChange={(e) => setYears(years.map((v, j) => (j === i ? e.target.value : v)))} /></th>
            ))}</tr></thead>
            <tbody>{(q.rows ?? []).map((r) => (
              <tr key={r}><th>{r}</th>{[0, 1, 2].map((i) => (
                <td key={i}><input aria-label={`${r}, ${years[i]}`} inputMode="decimal" value={values[r]?.[i] ?? ''} maxLength={30}
                  onChange={(e) => setValues({ ...values, [r]: (values[r] ?? ['', '', '']).map((v, j) => (j === i ? e.target.value : v)) })} /></td>
              ))}</tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {msg && <p className={msg.ok ? 'pq-saved' : 'err'} role="status">{msg.text}</p>}
      <div className="cp-form-actions">
        <button type="button" className="primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        {q.type === 'text' && <><CopyBtn text={short} label="Copy short" /><CopyBtn text={long} label="Copy long" /></>}
        {q.type === 'line' && <CopyBtn text={short} />}
        {q.type === 'yesno' && <CopyBtn text={yesnoText()} />}
        {q.type === 'figures' && <CopyBtn text={figuresText()} label="Copy table" />}
        {hasStarter && <button type="button" className="cp-btn" onClick={useStarter} title="Fills empty boxes with a sample answer to edit">Use starter answer</button>}
        {a?.updated_at && <span className="muted small">Last saved {ukDate(a.updated_at.slice(0, 10))}</span>}
      </div>
      {hasStarter && <p className="hint">Starter answers are written for landscaping firms. Replace everything in [square brackets] and make sure every word is true for your business.</p>}
    </div>
  );
}

const BLANK: Omit<Project, 'id'> = {
  title: '', client: '', location: '', value_gbp: null, start_date: null, end_date: null, scope: '', outcome: '',
  ref_name: '', ref_role: '', ref_email: '', ref_phone: '', share_reference: false,
};

function projectText(p: Project) {
  return [
    p.title,
    [p.client && `Client: ${p.client}`, p.location && `Location: ${p.location}`, p.value_gbp != null && `Value: £${Math.round(p.value_gbp).toLocaleString('en-GB')}`].filter(Boolean).join('. '),
    [p.start_date && `Start: ${ukDate(p.start_date)}`, p.end_date && `Completion: ${ukDate(p.end_date)}`].filter(Boolean).join('. '),
    p.scope && `Scope: ${p.scope}`,
    p.outcome && `Outcome: ${p.outcome}`,
    p.ref_name && `Reference: ${[p.ref_name, p.ref_role, p.ref_email, p.ref_phone].filter(Boolean).join(', ')}`,
  ].filter(Boolean).join('\n');
}

function Projects({ businessId, projects }: { businessId: string; projects: Project[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Project | (Omit<Project, 'id'> & { id: null }) | null>(null);
  const [err, setErr] = useState('');

  async function remove(p: Project) {
    if (!window.confirm(`Delete ${p.title} from your project references?`)) return;
    try { await post('/api/pqq/project/delete', { businessId, id: p.id }); router.refresh(); } catch (e) { setErr((e as Error).message); }
  }

  return (
    <section id="sec-projects" className="cp-group">
      <h2>Project references</h2>
      <p className="muted small">Most questionnaires ask for three recent, similar projects with a client reference. Keep your best ones here.</p>
      {err && <p className="err">{err}</p>}
      {projects.map((p) => editing && editing.id === p.id
        ? <ProjectForm key={p.id} businessId={businessId} start={editing} onDone={() => { setEditing(null); router.refresh(); }} />
        : (
          <div key={p.id} className="pq-project">
            <div>
              <strong>{p.title}</strong>
              <span className="muted small">{[p.client, p.location, p.value_gbp != null ? `£${Math.round(p.value_gbp).toLocaleString('en-GB')}` : null, p.end_date ? `completed ${ukDate(p.end_date)}` : null].filter(Boolean).join(' · ')}</span>
              {p.ref_name && <span className="muted small">Reference: {p.ref_name}{p.share_reference ? ' (shown on share links)' : ''}</span>}
            </div>
            <div className="cp-actions">
              <CopyBtn text={projectText(p)} />
              <button type="button" className="cp-btn" onClick={() => setEditing(p)}>Edit</button>
              <button type="button" className="cp-btn quiet" onClick={() => remove(p)}>Delete</button>
            </div>
          </div>
        ))}
      {editing && editing.id === null
        ? <ProjectForm businessId={businessId} start={editing} onDone={() => { setEditing(null); router.refresh(); }} />
        : <button type="button" className="primary" onClick={() => setEditing({ ...BLANK, id: null })}>Add a project</button>}
    </section>
  );
}

function ProjectForm({ businessId, start, onDone }: { businessId: string; start: Project | (Omit<Project, 'id'> & { id: null }); onDone: () => void }) {
  const [p, setP] = useState({ ...start, value: start.value_gbp != null ? String(start.value_gbp) : '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: string, v: string | boolean) => setP({ ...p, [k]: v });
  const fid = (k: string) => `pj-${start.id ?? 'new'}-${k}`;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    const value = p.value.replace(/[£,\s]/g, '');
    if (value && !/^\d+(\.\d+)?$/.test(value)) return setErr('Enter the value as a number, for example 125000.');
    setBusy(true);
    try {
      await post('/api/pqq/project', {
        businessId, id: start.id, title: p.title, client: p.client, location: p.location,
        value_gbp: value ? Number(value) : null, start_date: p.start_date || null, end_date: p.end_date || null,
        scope: p.scope, outcome: p.outcome, ref_name: p.ref_name, ref_role: p.ref_role,
        ref_email: p.ref_email, ref_phone: p.ref_phone, share_reference: p.share_reference,
      });
      onDone();
    } catch (e2) { setErr((e2 as Error).message); setBusy(false); }
  }

  const text = (k: keyof typeof p, label: string, extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <label htmlFor={fid(k)}>{label}<input id={fid(k)} value={(p[k] as string) ?? ''} onChange={(e) => set(k, e.target.value)} {...extra} /></label>
  );

  return (
    <form className="cp-form" onSubmit={save}>
      <h3>{start.id ? 'Edit project' : 'Add a project'}</h3>
      {text('title', 'Project name', { maxLength: 150, placeholder: 'e.g. Glenvale Park Phase 2, soft landscaping' })}
      <div className="two">
        {text('client', 'Client', { maxLength: 150 })}
        {text('location', 'Location', { maxLength: 150 })}
      </div>
      <div className="pq-three">
        {text('value', 'Contract value (£)', { inputMode: 'decimal', maxLength: 15 })}
        <label htmlFor={fid('start_date')}>Start<input id={fid('start_date')} type="date" value={p.start_date ?? ''} onChange={(e) => set('start_date', e.target.value)} /></label>
        <label htmlFor={fid('end_date')}>Completion<input id={fid('end_date')} type="date" value={p.end_date ?? ''} onChange={(e) => set('end_date', e.target.value)} /></label>
      </div>
      <label htmlFor={fid('scope')}>What you did<textarea id={fid('scope')} rows={4} maxLength={3000} value={p.scope ?? ''} placeholder="Scope of works, quantities, programme" onChange={(e) => set('scope', e.target.value)} /></label>
      <label htmlFor={fid('outcome')}>Challenges and outcome<textarea id={fid('outcome')} rows={3} maxLength={3000} value={p.outcome ?? ''} placeholder="What made it difficult, how you handled it, and the result for the client" onChange={(e) => set('outcome', e.target.value)} /></label>
      <fieldset className="cp-include" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <legend>Client reference (ask their permission first)</legend>
        {text('ref_name', 'Name', { maxLength: 120 })}
        {text('ref_role', 'Job title', { maxLength: 120 })}
        {text('ref_email', 'Email', { maxLength: 200, type: 'email' })}
        {text('ref_phone', 'Phone', { maxLength: 40 })}
        <label className="check" htmlFor={fid('share')} style={{ gridColumn: '1 / -1' }}>
          <input id={fid('share')} type="checkbox" checked={p.share_reference} onChange={(e) => set('share_reference', e.target.checked)} />
          Show the reference contact on compliance pack share links
        </label>
      </fieldset>
      {err && <p className="err">{err}</p>}
      <div className="cp-form-actions">
        <button type="submit" className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save project'}</button>
        <button type="button" onClick={onDone} disabled={busy}>Cancel</button>
      </div>
    </form>
  );
}
