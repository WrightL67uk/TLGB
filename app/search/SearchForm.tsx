'use client';

import { useState } from 'react';
import { GENERAL_ACCREDITATIONS, TRADES, PL_COVER_OPTIONS, accreditationsForTrade, gbp, type Accreditation } from '@/lib/config';

/**
 * Search bar plus a filters panel. The panel only shows the qualifications that
 * belong to the trade chosen, so it stays short whatever the trade.
 */
export default function SearchForm({
  postcode, trade: initialTrade, minPl, accreds,
}: { postcode: string; trade: string; minPl: string; accreds: string[] }) {
  const [trade, setTrade] = useState(initialTrade);
  const tradeItems = trade ? accreditationsForTrade(trade) : [];
  const tradeLabel = TRADES.find((t) => t.slug === trade)?.label;
  const activeCount = accreds.length + (minPl ? 1 : 0);

  const chip = (a: Accreditation) => (
    <label key={a.key} className="chip">
      <input type="checkbox" name="accred" value={a.key} defaultChecked={accreds.includes(a.key)} />
      <span>{a.label}</span>
    </label>
  );

  return (
    <form className="search2" method="get" action="/search">
      <div className="search2-bar">
        <label>Job postcode<input name="postcode" defaultValue={postcode} required placeholder="e.g. EN8 8YD" /></label>
        <label>Trade
          <select name="trade" value={trade} onChange={(e) => setTrade(e.target.value)}>
            <option value="">Any trade</option>
            {TRADES.map((t) => <option key={t.slug} value={t.slug}>{t.label}</option>)}
          </select>
        </label>
        <button type="submit" className="sq sq-rust">search</button>
      </div>

      <details className="filters" open={activeCount > 0}>
        <summary>Filters{activeCount ? ` (${activeCount})` : ''}</summary>
        <div className="filters-body">
          <label className="filter-pl">Minimum public liability
            <select name="pl" defaultValue={minPl}>
              <option value="">Any</option>
              {PL_COVER_OPTIONS.map((n) => <option key={n} value={n}>{gbp(n)}</option>)}
            </select>
          </label>

          {tradeItems.length > 0 ? (
            <div>
              <p className="acc-head">{tradeLabel} qualifications</p>
              <div className="chips">{tradeItems.map(chip)}</div>
            </div>
          ) : (
            <p className="hint">Choose a trade to filter by its own qualifications, for example ARB Approved for tree surgeons or CMLI for landscape architects.</p>
          )}

          <div>
            <p className="acc-head">Health and safety, prequalification and standards</p>
            <div className="chips">{GENERAL_ACCREDITATIONS.map(chip)}</div>
          </div>

          <div className="filters-actions">
            <button type="submit" className="sq sq-rust">apply filters</button>
            {activeCount > 0 && (
              <a href={`/search?postcode=${encodeURIComponent(postcode)}${trade ? `&trade=${trade}` : ''}`}>clear filters</a>
            )}
          </div>
        </div>
      </details>
    </form>
  );
}
