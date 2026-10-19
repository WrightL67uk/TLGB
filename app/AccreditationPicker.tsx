'use client';

import { useState } from 'react';
import { ACCREDITATIONS, ACCREDITATIONS_WITHOUT_EXPIRY } from '@/lib/config';

const optional = (a: string) => (ACCREDITATIONS_WITHOUT_EXPIRY as readonly string[]).includes(a);
const FIELD = 'accexp__';

/** Accreditation tick boxes, with an expiry date box for each one ticked. */
export default function AccreditationPicker({
  defaultSelected = [], defaultExpiries = {},
}: { defaultSelected?: string[]; defaultExpiries?: Record<string, string> }) {
  const [selected, setSelected] = useState<string[]>(defaultSelected);
  const toggle = (a: string, on: boolean) =>
    setSelected((s) => (on ? [...s.filter((x) => x !== a), a] : s.filter((x) => x !== a)));

  return (
    <>
      <div className="checks">
        {ACCREDITATIONS.map((a) => (
          <label key={a} className="check" htmlFor={`acc-${a}`}>
            <input id={`acc-${a}`} type="checkbox" name="accreditations" value={a}
              checked={selected.includes(a)} onChange={(e) => toggle(a, e.target.checked)} /> {a}
          </label>
        ))}
      </div>
      {selected.length > 0 && (
        <div className="acc-expiries">
          <p className="hint">Expiry dates, as shown on each certificate. We remind you before they run out.</p>
          {ACCREDITATIONS.filter((a) => selected.includes(a)).map((a) => (
            <label key={a} htmlFor={`accexp-${a}`}>{a} expires{optional(a) ? ' (if it has a date)' : ''}
              <input id={`accexp-${a}`} type="date" name={`${FIELD}${a}`}
                defaultValue={defaultExpiries[a] ?? ''} required={!optional(a)} />
            </label>
          ))}
        </div>
      )}
    </>
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
