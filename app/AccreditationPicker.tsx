'use client';

import { useEffect, useRef, useState } from 'react';
import { ACCREDITATION_LIST, GENERAL_ACCREDITATIONS, TRADES, accreditationsForTrade, type Accreditation } from '@/lib/config';

const FIELD = 'accexp__';

/**
 * Accreditation tick boxes, grouped:
 *  - general schemes (CHAS, Constructionline...) always shown
 *  - one group per trade ticked elsewhere in the same form (name="trades"),
 *    showing the qualifications that are usual for that trade.
 * Ticking anything with an expiry date opens a date box for it.
 */
export default function AccreditationPicker({
  defaultSelected = [], defaultExpiries = {},
}: { defaultSelected?: string[]; defaultExpiries?: Record<string, string> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string[]>(defaultSelected);
  const [trades, setTrades] = useState<string[]>([]);

  // Follow the trade tick boxes in the surrounding form.
  useEffect(() => {
    const form = ref.current?.closest('form');
    if (!form) return;
    const read = () =>
      setTrades(Array.from(form.querySelectorAll<HTMLInputElement>('input[name="trades"]:checked')).map((i) => i.value));
    read();
    const onChange = (e: Event) => {
      if ((e.target as HTMLInputElement)?.name === 'trades') read();
    };
    form.addEventListener('change', onChange);
    return () => form.removeEventListener('change', onChange);
  }, []);

  const toggle = (a: string, on: boolean) =>
    setSelected((s) => (on ? [...s.filter((x) => x !== a), a] : s.filter((x) => x !== a)));

  // Each trade-specific item shows once, under the first ticked trade it belongs to.
  const shown = new Set(GENERAL_ACCREDITATIONS.map((a) => a.key));
  const tradeGroups = TRADES.filter((t) => trades.includes(t.slug))
    .map((t) => {
      const items = accreditationsForTrade(t.slug).filter((a) => !shown.has(a.key));
      items.forEach((a) => shown.add(a.key));
      return { trade: t, items };
    })
    .filter((g) => g.items.length > 0);

  // Anything already held but not in a visible group (e.g. a trade was unticked) stays visible so it isn't lost.
  const orphans = ACCREDITATION_LIST.filter((a) => selected.includes(a.key) && !shown.has(a.key));

  const box = (a: Accreditation) => (
    <label key={a.key} className="check" htmlFor={`acc-${a.key}`}>
      <input id={`acc-${a.key}`} type="checkbox" name="accreditations" value={a.key}
        checked={selected.includes(a.key)} onChange={(e) => toggle(a.key, e.target.checked)} /> {a.label}
    </label>
  );

  const ticked = ACCREDITATION_LIST.filter((a) => selected.includes(a.key));

  return (
    <div ref={ref} className="acc-picker">
      <div className="acc-group">
        <p className="acc-head">Health and safety, prequalification and standards</p>
        <div className="checks">{GENERAL_ACCREDITATIONS.map(box)}</div>
      </div>

      {tradeGroups.map((g) => (
        <div key={g.trade.slug} className="acc-group">
          <p className="acc-head">{g.trade.label} qualifications</p>
          <div className="checks">{g.items.map(box)}</div>
        </div>
      ))}
      {trades.length === 0 && (
        <p className="hint">Tick your trades above to see the qualifications that apply to them.</p>
      )}

      {orphans.length > 0 && (
        <div className="acc-group">
          <p className="acc-head">Also held</p>
          <div className="checks">{orphans.map(box)}</div>
        </div>
      )}

      {ticked.length > 0 && (
        <div className="acc-expiries">
          <p className="hint">Expiry dates, as shown on each certificate. We remind you before they run out.</p>
          {ticked.map((a) => (
            <label key={a.key} htmlFor={`accexp-${a.key}`}>{a.label} expires{a.expires ? '' : ' (if it has a date)'}
              <input id={`accexp-${a.key}`} type="date" name={`${FIELD}${a.key}`}
                defaultValue={defaultExpiries[a.key] ?? ''} required={a.expires} />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/** Reads the expiry boxes back out of a submitted form. */
export function readAccreditationExpiries(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (k.startsWith(FIELD) && typeof v === 'string' && v) out[k.slice(FIELD.length)] = v;
  }
  return out;
}
