'use client';

import { useMemo, useState } from 'react';
import { keyDates, lateInterest, ukDay, money, todayUK, SCHEME_TERMS, type Terms } from '@/lib/payDates';

export default function Calculator({ baseRate }: { baseRate: number }) {
  const today = todayUK();
  const [applied, setApplied] = useState(today);
  const [periodEnd, setPeriodEnd] = useState(today);
  const [mode, setMode] = useState<'scheme' | 'custom'>('scheme');
  const [dueDays, setDueDays] = useState(0);
  const [finalDays, setFinalDays] = useState(30);
  const [noticeDays, setNoticeDays] = useState(5);
  const [paylessDays, setPaylessDays] = useState(7);
  const [exclude, setExclude] = useState(true);
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState(String(baseRate));

  const terms: Terms = mode === 'scheme' ? SCHEME_TERMS : { mode, dueDays, finalDays, noticeDays, paylessDays, excludeHolidays: exclude };
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(applied) && (mode === 'custom' || /^\d{4}-\d{2}-\d{2}$/.test(periodEnd));
  const d = useMemo(() => (valid ? keyDates(terms, applied, mode === 'scheme' ? periodEnd : null) : null), [valid, applied, periodEnd, mode, dueDays, finalDays, noticeDays, paylessDays, exclude]); // eslint-disable-line react-hooks/exhaustive-deps
  const debt = Number(amount.replace(/[£,\s]/g, ''));
  const li = d && debt > 0 ? lateInterest(debt, d.suspendNoticeFrom, (() => { const x = new Date(`${d.suspendNoticeFrom}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + 29); return x.toISOString().slice(0, 10); })(), Number(rate) || 0) : null;
  const num = (v: string, set: (n: number) => void) => set(Math.max(0, Math.min(120, Math.round(Number(v) || 0))));

  return (
    <div className="pay-calc">
      <div className="pay-form">
        <div className="seg">
          <button type="button" className={mode === 'scheme' ? 'on' : ''} onClick={() => setMode('scheme')}>Scheme (no payment terms)</button>
          <button type="button" className={mode === 'custom' ? 'on' : ''} onClick={() => setMode('custom')}>My subcontract&rsquo;s terms</button>
        </div>
        <div className="row">
          <label>Date of your application<input type="date" value={applied} onChange={(e) => setApplied(e.target.value)} /></label>
          {mode === 'scheme' && <label>End of the payment period (valuation date)<input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} /></label>}
        </div>
        {mode === 'custom' && (
          <>
            <div className="row">
              <label>Due date is<span className="inl"><input type="number" min={0} max={120} value={dueDays} onChange={(e) => num(e.target.value, setDueDays)} /> days after the application</span></label>
              <label>Final date is<span className="inl"><input type="number" min={0} max={120} value={finalDays} onChange={(e) => num(e.target.value, setFinalDays)} /> days after the due date</span></label>
            </div>
            <div className="row">
              <label>Payment notice within<span className="inl"><input type="number" min={0} max={60} value={noticeDays} onChange={(e) => num(e.target.value, setNoticeDays)} /> days after the due date</span></label>
              <label>Pay less notice at least<span className="inl"><input type="number" min={0} max={60} value={paylessDays} onChange={(e) => num(e.target.value, setPaylessDays)} /> days before the final date</span></label>
            </div>
            <label className="chk"><input type="checkbox" checked={exclude} onChange={(e) => setExclude(e.target.checked)} /> Leave out Christmas Day, Good Friday and bank holidays when counting (as the Act does)</label>
          </>
        )}
        <div className="row">
          <label>Amount applied for (optional)<input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 25,000" /></label>
          <label>Bank of England base rate %<input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} /></label>
        </div>
      </div>

      {d && (
        <ol className="pay-timeline">
          <li><span>{ukDay(applied)}</span><b>You apply</b></li>
          <li><span>{ukDay(d.due)}</span><b>Payment due date</b></li>
          <li className="hl"><span>{ukDay(d.paymentNoticeBy)}</span><b>Last day for their payment notice</b><em>No notice by then? If you applied in line with the contract, your application amount becomes the sum due.</em></li>
          <li className="hl"><span>{ukDay(d.paylessBy)}</span><b>Last day for a pay less notice</b><em>After this they must pay the notified sum in full.</em></li>
          <li className="key"><span>{ukDay(d.finalDate)}</span><b>Final date for payment</b><em>The money must be in your account by the end of this day.</em></li>
          <li><span>{ukDay(d.suspendNoticeFrom)}</span><b>If unpaid: give notice of intention to suspend</b><em>{li ? <>Late payment interest runs from here: about {money(li.daily)} a day at {li.rate}%, plus {money(li.compensation)} fixed compensation.</> : 'Late payment interest starts to run.'}</em></li>
          <li><span>{ukDay(d.suspendFrom)}</span><b>Earliest day you can suspend work</b><em>After at least 7 days&rsquo; notice.</em></li>
        </ol>
      )}
      {d && d.skipped.length > 0 && <p className="muted small">Not counted: {d.skipped.map(ukDay).join(', ')}.</p>}
    </div>
  );
}
