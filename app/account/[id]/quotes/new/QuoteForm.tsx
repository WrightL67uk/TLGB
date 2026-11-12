'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { QUOTE_CATEGORIES, ROOT_TYPES, PLANTS, PLANT_SIZES, MATERIAL_SPECS } from '@/lib/quoteTypes';

type Line = { key: number; category: string; item: string; spec: string; root: string; qty: string; unit: string; notes: string };
type Match = { id: string; name: string; town: string | null; dist: number | null; national: boolean; covers: string[]; rating: { avg: number; count: number } | null };

const MAX_PICK = 6;
const START_PICK = 4;
let nextKey = 1;
const blankLine = (category = 'trees-plants'): Line => ({ key: nextKey++, category, item: '', spec: '', root: category === 'trees-plants' ? 'container' : '', qty: '', unit: QUOTE_CATEGORIES.find((c) => c.key === category)!.units[0], notes: '' });

const plantIndex = PLANTS.map((p) => [p.toLowerCase(), p] as const);
const known = new Set([...PLANTS, ...MATERIAL_SPECS].map((s) => s.toLowerCase()));
const SIZE_RE = /\b(P9|\d+(?:\.\d+)?\s?(?:L|ltr|litres?|liters?)|\d+\s?-\s?\d+\s?cm(?:\s?girth)?)\b/i;

function tidySize(s: string) {
  const t = s.trim();
  const litres = t.match(/^(\d+(?:\.\d+)?)\s?(?:L|ltr|litres?|liters?)$/i);
  if (litres) return `${litres[1]}L`;
  const range = t.match(/^(\d+)\s?-\s?(\d+)\s?cm(\s?girth)?$/i);
  if (range) return `${range[1]}-${range[2]}cm${range[3] ? ' girth' : ''}`;
  return t.toUpperCase() === 'P9' ? 'P9' : t;
}

function bestPlant(name: string) {
  const n = name.toLowerCase().replace(/\s+/g, ' ').trim();
  return plantIndex.find(([l]) => l === n)?.[1] ?? plantIndex.find(([l]) => l.startsWith(n) || n.startsWith(l))?.[1] ?? name.trim();
}

/** Turns pasted rows ("3 Acer palmatum 10L", or columns copied from a spreadsheet) into lines. */
function parsePaste(text: string): Line[] {
  const out: Line[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const row = raw.trim();
    if (!row) continue;
    let qty = ''; let size = ''; let name = '';
    const cells = row.includes('\t') ? row.split('\t') : row.includes(',') ? row.split(',') : null;
    if (cells) {
      const rest: string[] = [];
      for (const c of cells.map((x) => x.trim()).filter(Boolean)) {
        if (!qty && /^\d+(\.\d+)?$/.test(c)) qty = c;
        else if (!size && SIZE_RE.test(c) && c.replace(SIZE_RE, '').trim().length < 3) size = tidySize(c.match(SIZE_RE)![0]);
        else rest.push(c);
      }
      name = rest.sort((a, b) => b.length - a.length)[0] ?? '';
    } else {
      let r = row;
      const s = r.match(SIZE_RE);
      if (s) { size = tidySize(s[0]); r = r.replace(s[0], ' '); }
      const q = r.match(/(?:^|\s)(?:x\s?)?(\d+(?:\.\d+)?)\s?(?:no\.?|nr|x)?(?=\s|$)/i);
      if (q) { qty = q[1]; r = r.replace(q[0], ' '); }
      name = r.replace(/\s+/g, ' ').replace(/^[-x*•.\s]+|[-.\s]+$/g, '').trim();
    }
    if (!name) continue;
    const l = blankLine('trees-plants');
    l.item = bestPlant(name);
    l.spec = size;
    l.qty = qty;
    if (/girth/i.test(size)) l.root = 'rootball';
    out.push(l);
  }
  return out;
}

const addWorkingDays = (n: number) => {
  const d = new Date();
  while (n > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) n--; }
  return d.toISOString().slice(0, 10);
};
const miles = (m: Match) => (m.dist != null ? `${Math.round(m.dist)} miles` : m.national ? 'delivers nationally' : '');
const stars = (avg: number) => '★★★★★'.slice(0, Math.round(avg)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(avg));

export default function QuoteForm({ businessId, basePostcode }: { businessId: string; basePostcode: string }) {
  const [reference, setReference] = useState('');
  const [postcode, setPostcode] = useState('');
  const [neededBy, setNeededBy] = useState('');
  const [closesOn, setClosesOn] = useState(addWorkingDays(3));
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [lines, setLines] = useState<Line[]>(() => [blankLine()]);
  const [paste, setPaste] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [matchMsg, setMatchMsg] = useState('');
  const [chosen, setChosen] = useState<string[]>([]);
  const touched = useRef(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const categories = useMemo(() => Array.from(new Set(lines.filter((l) => l.item.trim()).map((l) => l.category))).sort(), [lines]);
  const catKey = categories.join(',');

  useEffect(() => {
    if (postcode.trim().length < 5 || !categories.length) { setMatches(null); setMatchMsg(''); return; }
    const t = setTimeout(async () => {
      setMatchMsg('Finding suppliers...');
      try {
        const res = await fetch('/api/quotes/match', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ businessId, postcode, categories }) });
        const j = await res.json();
        if (!j.ok) { setMatches(null); setMatchMsg(j.error); return; }
        setMatches(j.matches); setMatchMsg('');
        const ids: string[] = j.matches.map((m: Match) => m.id);
        setChosen((prev) => (touched.current ? prev.filter((id) => ids.includes(id)) : ids.slice(0, START_PICK)));
      } catch { setMatchMsg('Could not check suppliers just now.'); }
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postcode, catKey, businessId]);

  const update = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => {
    if (l.key !== key) return l;
    const n = { ...l, ...patch };
    if (patch.category) {
      const units = QUOTE_CATEGORIES.find((c) => c.key === patch.category)!.units;
      if (!units.includes(n.unit)) n.unit = units[0];
      if (patch.category !== 'trees-plants') n.root = '';
    }
    return n;
  }));

  function addPasted() {
    const parsed = parsePaste(paste);
    if (!parsed.length) { setError('Nothing found in the pasted text. Put one item per line, for example "3 Acer palmatum 10L".'); return; }
    setLines((ls) => [...ls.filter((l) => l.item.trim()), ...parsed]);
    setPaste(''); setShowPaste(false); setError('');
  }

  function toggle(id: string) {
    touched.current = true;
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= MAX_PICK ? c : [...c, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const filled = lines.filter((l) => l.item.trim());
    if (!filled.length) { setError('Add at least one item.'); return; }
    const noQty = filled.find((l) => !(Number(l.qty) > 0));
    if (noQty) { setError(`Add a quantity for "${noQty.item}".`); return; }
    if (!chosen.length) { setError('Tick at least one supplier.'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/quotes/create', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          businessId, reference, postcode, neededBy, closesOn, deliveryNotes, suppliers: chosen,
          lines: filled.map((l) => ({ category: l.category, item: l.item, spec: l.spec, root: l.root, qty: l.qty, unit: l.unit, notes: l.notes })),
        }),
      });
      const j = await res.json();
      if (j.ok) { window.location.href = j.next; return; }
      setError(j.error || 'Something went wrong. Please try again.');
    } catch { setError('Could not reach the site. Check your connection and try again.'); }
    setBusy(false);
  }

  return (
    <form className="qt-form" onSubmit={submit}>
      <datalist id="q-plants">{PLANTS.map((p) => <option key={p} value={p} />)}</datalist>
      <datalist id="q-materials">{MATERIAL_SPECS.map((p) => <option key={p} value={p} />)}</datalist>
      <datalist id="q-sizes">{PLANT_SIZES.map((p) => <option key={p} value={p} />)}</datalist>

      <div className="qt-box">
        <h2>1. The job</h2>
        <div className="row">
          <label>Your reference
            <input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={80} placeholder="e.g. Codicote plots 1-20" />
          </label>
          <label>Delivery postcode
            <input value={postcode} onChange={(e) => setPostcode(e.target.value.toUpperCase())} maxLength={10} placeholder={basePostcode || 'e.g. SG1 2AB'} />
          </label>
          <label>Needed on site by <span className="hint">(optional)</span>
            <input type="date" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} />
          </label>
          <label>Prices wanted by
            <input type="date" value={closesOn} onChange={(e) => setClosesOn(e.target.value)} />
            <span className="hint">5pm that day</span>
          </label>
        </div>
        <label style={{ marginTop: 12 }}>Delivery notes <span className="hint">(optional: access, offloading, booking, phased deliveries)</span>
          <textarea value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} maxLength={1000} />
        </label>
      </div>

      <div className="qt-box">
        <h2>2. What you need</h2>
        <p className="hint" style={{ margin: '0 0 10px' }}>Pick names and sizes from the suggestions where you can, so every supplier prices the same thing.</p>
        <div className="qt-actions" style={{ marginBottom: 10 }}>
          <button type="button" className="qt-btn small" onClick={() => setShowPaste((s) => !s)}>Paste a list</button>
          <span className="hint">Copy rows from a planting schedule or spreadsheet: name, size and quantity.</span>
        </div>
        {showPaste && (
          <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
            <textarea value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'3 Acer palmatum 10L\n10 Hebe Green Globe 3L\n20 Choisya ternata 5L'} style={{ minHeight: 120 }} />
            <div><button type="button" className="qt-btn" onClick={addPasted}>Add to the list</button></div>
          </div>
        )}
        <div className="qt-head"><span>#</span><span>Type</span><span>Item</span><span>Size or spec</span><span>Root</span><span>Qty</span><span>Unit</span><span /></div>
        <div className="qt-lines">
          {lines.map((l, i) => {
            const plant = l.category === 'trees-plants';
            const unlisted = l.item.trim().length > 2 && !known.has(l.item.trim().toLowerCase());
            return (
              <div key={l.key} className="qt-line">
                <span className="n">{i + 1}</span>
                <select aria-label="Type" value={l.category} onChange={(e) => update(l.key, { category: e.target.value })}>
                  {QUOTE_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
                <div className="wide">
                  <input aria-label="Item" value={l.item} list={plant ? 'q-plants' : 'q-materials'} onChange={(e) => update(l.key, { item: e.target.value })} placeholder={plant ? 'e.g. Choisya ternata' : 'e.g. BS 3882 multipurpose topsoil'} maxLength={120} />
                  {unlisted && plant && <span className="qt-flag">Not on our list. Check the spelling, or it will be sent as typed.</span>}
                </div>
                <input aria-label="Size or spec" value={l.spec} list={plant ? 'q-sizes' : undefined} onChange={(e) => update(l.key, { spec: e.target.value })} placeholder={plant ? 'e.g. 5L' : 'optional'} maxLength={80} />
                <select aria-label="Root" value={l.root} onChange={(e) => update(l.key, { root: e.target.value })} disabled={!plant}>
                  <option value="">{plant ? 'Any' : 'n/a'}</option>
                  {ROOT_TYPES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                </select>
                <input aria-label="Quantity" type="number" min={0} step="any" value={l.qty} onChange={(e) => update(l.key, { qty: e.target.value })} />
                <select aria-label="Unit" value={l.unit} onChange={(e) => update(l.key, { unit: e.target.value })}>
                  {QUOTE_CATEGORIES.find((c) => c.key === l.category)!.units.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
                <button type="button" className="x" aria-label="Remove line" onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : [blankLine()]))}>×</button>
                <input className="full" aria-label="Notes" value={l.notes} onChange={(e) => update(l.key, { notes: e.target.value })} placeholder="Notes for this item (optional), e.g. matching pairs, clear stem 1.8m" maxLength={200} />
              </div>
            );
          })}
        </div>
        <div className="qt-actions" style={{ marginTop: 10 }}>
          <button type="button" className="qt-btn small" onClick={() => setLines((ls) => [...ls, blankLine(ls[ls.length - 1]?.category)])}>Add another item</button>
          <span className="hint">{lines.filter((l) => l.item.trim()).length} item{lines.filter((l) => l.item.trim()).length === 1 ? '' : 's'}</span>
        </div>
      </div>

      <div className="qt-box">
        <h2>3. Who to ask</h2>
        {!matches && !matchMsg && <p className="hint">Add the delivery postcode and at least one item, and we will show the suppliers that stock it and deliver there.</p>}
        {matchMsg && <p className="hint">{matchMsg}</p>}
        {matches && !matches.length && <p>No suppliers taking estimate requests cover this yet. We have been told, and we are signing more up.</p>}
        {matches && matches.length > 0 && (
          <>
            <p className="hint" style={{ margin: '0 0 8px' }}>Ticked suppliers get your list. Pick up to {MAX_PICK}. They will see your business name and delivery area, not your contact details, until you accept a price.</p>
            <div className="qt-sups">
              {matches.map((m) => (
                <label key={m.id} className="qt-sup">
                  <input type="checkbox" checked={chosen.includes(m.id)} onChange={() => toggle(m.id)} disabled={!chosen.includes(m.id) && chosen.length >= MAX_PICK} />
                  <span>
                    <b>{m.name}</b>{m.town ? `, ${m.town}` : ''}
                    <span className="meta"> · {miles(m)}{m.covers.length < categories.length ? ` · covers ${m.covers.length} of ${categories.length} types on your list` : ''}</span>
                    {m.rating && <span className="meta"> · <span className="stars">{stars(m.rating.avg)}</span> {m.rating.avg.toFixed(1)} from {m.rating.count} order{m.rating.count === 1 ? '' : 's'}</span>}
                  </span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>

      {error && <p className="err big">{error}</p>}
      <div className="qt-actions">
        <button type="submit" className="sq sq-rust" disabled={busy}>{busy ? 'Sending...' : `Send to ${chosen.length || ''} supplier${chosen.length === 1 ? '' : 's'}`}</button>
      </div>
    </form>
  );
}
