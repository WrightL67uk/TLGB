'use client';
import { useState } from 'react';

type Line = { id: string; item: string; detail: string; qty: number; unit: string; notes: string | null };
type Price = { available: 'yes' | 'no' | 'sub'; unit_price: string; substitute: string; note: string };
type Props = {
  token: string;
  lines: Line[];
  start: Record<string, Price>;
  delivery: string; leadDays: string; validUntil: string; notes: string;
};

const fmt = (n: number) => n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
const num = (s: string) => { const n = Number(s.replace(/[£,\s]/g, '')); return s.trim() && Number.isFinite(n) ? n : null; };

export default function PriceForm({ token, lines, start, delivery: d0, leadDays: l0, validUntil: v0, notes: n0 }: Props) {
  const [prices, setPrices] = useState<Record<string, Price>>(start);
  const [delivery, setDelivery] = useState(d0);
  const [lead, setLead] = useState(l0);
  const [valid, setValid] = useState(v0);
  const [notes, setNotes] = useState(n0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (id: string, patch: Partial<Price>) => setPrices((p) => ({ ...p, [id]: { ...p[id], ...patch } }));
  const goods = lines.reduce((t, l) => {
    const p = prices[l.id];
    const u = p.available === 'no' ? null : num(p.unit_price);
    return t + (u ?? 0) * l.qty;
  }, 0);
  const del = num(delivery) ?? 0;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError('');
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/quote/${encodeURIComponent(token)}`, { method: 'POST', body: fd, headers: { accept: 'application/json' } });
      const j = await res.json();
      if (j.ok) { window.location.href = j.next; return; }
      setError(j.error || 'Something went wrong. Please try again.');
    } catch {
      setError('Could not reach the site. Check your connection and try again.');
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="qt-box">
      <h2>Your prices</h2>
      <p className="hint" style={{ margin: '0 0 6px' }}>Prices per unit, excluding VAT. If you are short of something, offer an alternative or mark it not available.</p>
      {lines.map((l, i) => {
        const p = prices[l.id];
        const u = num(p.unit_price);
        return (
          <div key={l.id} className="qt-price">
            <div className="what">
              <b>{i + 1}. {l.qty.toLocaleString('en-GB')} {l.unit === 'each' ? '×' : l.unit} {l.item}</b>
              {l.detail && <span>{l.detail}</span>}
              {l.notes && <span>Note: {l.notes}</span>}
            </div>
            <label>Can you supply it?
              <select name={`avail_${l.id}`} value={p.available} onChange={(e) => set(l.id, { available: e.target.value as Price['available'] })}>
                <option value="yes">Yes, as asked</option>
                <option value="sub">Alternative</option>
                <option value="no">Not available</option>
              </select>
            </label>
            <label>£ per {l.unit === 'each' ? 'item' : l.unit}
              <input name={`price_${l.id}`} inputMode="decimal" value={p.unit_price} disabled={p.available === 'no'} onChange={(e) => set(l.id, { unit_price: e.target.value })} placeholder="0.00" />
              {u != null && p.available !== 'no' && <span className="tot">{fmt(u * l.qty)}</span>}
            </label>
            <div style={{ display: 'grid', gap: 6 }}>
              {p.available === 'sub' && (
                <label>What you would supply instead
                  <input name={`sub_${l.id}`} value={p.substitute} onChange={(e) => set(l.id, { substitute: e.target.value })} placeholder="e.g. 5L instead of 10L" />
                </label>
              )}
              <label>Note (optional)
                <input name={`note_${l.id}`} value={p.note} onChange={(e) => set(l.id, { note: e.target.value })} placeholder="e.g. ready in 2 weeks" />
              </label>
            </div>
          </div>
        );
      })}

      <div className="row" style={{ marginTop: 14 }}>
        <label>Delivery charge (£)
          <input name="delivery_charge" inputMode="decimal" value={delivery} onChange={(e) => setDelivery(e.target.value)} placeholder="0 if free" />
        </label>
        <label>Lead time (working days)
          <input name="lead_days" type="number" min={0} max={365} value={lead} onChange={(e) => setLead(e.target.value)} />
        </label>
        <label>Prices valid until
          <input name="valid_until" type="date" value={valid} onChange={(e) => setValid(e.target.value)} />
        </label>
      </div>
      <label style={{ marginTop: 12 }}>Anything else the buyer should know
        <textarea name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Minimum order, offloading, payment terms, account needed..." />
      </label>

      <p style={{ margin: '14px 0 6px', fontSize: '1.05rem' }}>
        Goods {fmt(goods)} + delivery {fmt(del)} = <b>{fmt(goods + del)}</b> <span className="hint">excluding VAT</span>
      </p>
      {error && <p className="err big">{error}</p>}
      <div className="qt-actions" style={{ marginTop: 10 }}>
        <button type="submit" className="qt-btn go" disabled={busy}>{busy ? 'Sending...' : 'Send my prices'}</button>
        <span className="hint">You can change your prices until the deadline.</span>
      </div>
    </form>
  );
}
