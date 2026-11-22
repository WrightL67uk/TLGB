'use client';
import { useState } from 'react';

/** "Other (not listed)": the business says what it does. An admin approves it before it shows publicly. */
export default function OtherTrade({ saved, approved }: { saved: string; approved?: boolean }) {
  const [on, setOn] = useState(!!saved);
  return (
    <div className="other-trade">
      <label className="check">
        <input type="checkbox" name="other_trade_on" checked={on} onChange={(e) => setOn(e.target.checked)} /> Other (not in the list above)
      </label>
      {on && (
        <label>What do you do?
          <input name="other_trade" defaultValue={saved} maxLength={120} required minLength={3} placeholder="e.g. Specialist tree transplanting" />
          <span className="hint">{saved && approved ? 'Approved: shown on your profile.' : 'We will check this and add it to your profile. Until then you can still pick any trades above.'}</span>
        </label>
      )}
    </div>
  );
}
