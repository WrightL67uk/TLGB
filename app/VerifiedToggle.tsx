'use client';

import { useState } from 'react';

/** "Verified members only" tick box for the search forms. Warns the searcher when they untick it. */
export default function VerifiedToggle({ initial = true }: { initial?: boolean }) {
  const [on, setOn] = useState(initial);
  return (
    <>
      <label className="verified-only">
        <input type="hidden" name="v" value="1" />
        <input type="checkbox" name="verified" value="1" checked={on} onChange={(e) => setOn(e.target.checked)} />
        <span>Verified members only</span>
      </label>
      {!on && (
        <p className="verified-warning" role="alert">
          <strong>Unverified businesses will be included.</strong> Their membership has lapsed or their insurance has expired, so we
          cannot vouch for their insurance, accreditations or company details. Ask to see current certificates before you hire.
        </p>
      )}
    </>
  );
}
