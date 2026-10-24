// Payment dates under the Housing Grants, Construction and Regeneration Act 1996 (as amended by
// the Local Democracy, Economic Development and Construction Act 2009) and the Scheme for
// Construction Contracts (England and Wales) as amended in 2011. Shared by the free calculator
// and the members' payment tracker, so it must not import anything server-only.
//
// Scheme defaults for interim payments (used when the contract does not set its own):
//   due date            7 days after the end of the payment period, or the date of the
//                       application, whichever is later (Scheme Part II para 4)
//   payer's notice      within 5 days after the due date (Act s110A(2))
//   final date          17 days after the due date (Scheme para 8(2))
//   pay less notice     no later than 7 days before the final date (Scheme para 10)
//   suspension          after the final date passes unpaid, with at least 7 days' notice (s112)
// Counting days under the Act (s116): Christmas Day, Good Friday and bank holidays in England
// and Wales are left out.

export type Terms = {
  mode: 'scheme' | 'custom';
  /** custom: due date is this many days after the application */
  dueDays: number;
  /** custom: final date is this many days after the due date */
  finalDays: number;
  /** payer's payment notice within this many days after the due date */
  noticeDays: number;
  /** pay less notice no later than this many days before the final date */
  paylessDays: number;
  /** leave out Christmas Day, Good Friday and bank holidays when counting */
  excludeHolidays: boolean;
};

export const SCHEME_TERMS: Terms = { mode: 'scheme', dueDays: 7, finalDays: 17, noticeDays: 5, paylessDays: 7, excludeHolidays: true };

// England and Wales bank holidays, plus Christmas Day and Good Friday (always excluded).
// Update each year from gov.uk/bank-holidays.
const HOLIDAYS = new Set([
  // 2025
  '2025-01-01', '2025-04-18', '2025-04-21', '2025-05-05', '2025-05-26', '2025-08-25', '2025-12-25', '2025-12-26',
  // 2026
  '2026-01-01', '2026-04-03', '2026-04-06', '2026-05-04', '2026-05-25', '2026-08-31', '2026-12-25', '2026-12-28',
  // 2027
  '2027-01-01', '2027-03-26', '2027-03-29', '2027-05-03', '2027-05-31', '2027-08-30', '2027-12-25', '2027-12-27', '2027-12-28',
  // 2028
  '2028-01-03', '2028-04-14', '2028-04-17', '2028-05-01', '2028-05-29', '2028-08-28', '2028-12-25', '2028-12-26',
  // 2029
  '2029-01-01', '2029-03-30', '2029-04-02', '2029-05-07', '2029-05-28', '2029-08-27', '2029-12-25', '2029-12-26',
]);
export const HOLIDAYS_KNOWN_UNTIL = '2029-12-31';

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
export const iso = (d: Date) => d.toISOString().slice(0, 10);
const shift = (s: string, n: number) => { const d = toDate(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
export const isHoliday = (s: string) => HOLIDAYS.has(s);

/** Counts n days forward (or back if negative) from a date, skipping excluded days when asked. */
export function addDays(from: string, n: number, exclude: boolean): string {
  if (!exclude) return shift(from, n);
  let d = from;
  let left = Math.abs(n);
  const step = n < 0 ? -1 : 1;
  while (left > 0) {
    d = shift(d, step);
    if (!isHoliday(d)) left--;
  }
  return d;
}

export type KeyDates = {
  due: string;
  paymentNoticeBy: string;
  finalDate: string;
  paylessBy: string;
  /** earliest date a notice of intention to suspend can be given (the day after the final date) */
  suspendNoticeFrom: string;
  /** earliest date work can be suspended if a 7-day notice is given on suspendNoticeFrom */
  suspendFrom: string;
  /** dates inside the counting that were skipped as holidays */
  skipped: string[];
};

/** Key dates for one interim application. periodEnd only matters under the Scheme. */
export function keyDates(t: Terms, appliedOn: string, periodEnd?: string | null): KeyDates {
  const ex = t.excludeHolidays;
  let due: string;
  if (t.mode === 'scheme') {
    const fromPeriod = periodEnd ? addDays(periodEnd, 7, ex) : appliedOn;
    due = fromPeriod > appliedOn ? fromPeriod : appliedOn;
  } else {
    due = addDays(appliedOn, t.dueDays, ex);
  }
  const finalDays = t.mode === 'scheme' ? 17 : t.finalDays;
  const noticeDays = t.mode === 'scheme' ? 5 : t.noticeDays;
  const paylessDays = t.mode === 'scheme' ? 7 : t.paylessDays;
  const finalDate = addDays(due, finalDays, ex);
  const paymentNoticeBy = addDays(due, noticeDays, ex);
  const paylessBy = addDays(finalDate, -paylessDays, ex);
  const suspendNoticeFrom = shift(finalDate, 1);
  const suspendFrom = addDays(suspendNoticeFrom, 7, ex);

  const lo = periodEnd && periodEnd < appliedOn ? periodEnd : appliedOn;
  const skipped: string[] = [];
  if (ex) for (let d = lo; d <= suspendFrom; d = shift(d, 1)) if (isHoliday(d)) skipped.push(d);
  return { due, paymentNoticeBy, finalDate, paylessBy, suspendNoticeFrom, suspendFrom, skipped };
}

// ---------------------------------------------------------------
// Late Payment of Commercial Debts (Interest) Act 1998
// ---------------------------------------------------------------
/** Fixed compensation by size of the debt. */
export const fixedCompensation = (debt: number) => (debt < 1000 ? 40 : debt < 10000 ? 70 : 100);

/** Statutory interest: 8% over the Bank of England reference rate, simple, daily. */
export function lateInterest(debt: number, overdueSince: string, until: string, baseRate: number) {
  const days = Math.max(0, Math.round((toDate(until).getTime() - toDate(overdueSince).getTime()) / 86_400_000));
  const rate = baseRate + 8;
  const interest = Math.round(debt * (rate / 100) * (days / 365) * 100) / 100;
  return { days, rate, interest, daily: Math.round(debt * (rate / 100) / 365 * 100) / 100, compensation: fixedCompensation(debt) };
}

// ---------------------------------------------------------------
// Display
// ---------------------------------------------------------------
export const ukDay = (s: string) => toDate(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const daysFrom = (today: string, s: string) => Math.round((toDate(s).getTime() - toDate(today).getTime()) / 86_400_000);
export const todayUK = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
export const money = (n: number | null | undefined) => (n == null ? '' : `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
