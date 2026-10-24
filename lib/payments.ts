import { keyDates, daysFrom, iso, type Terms, type KeyDates } from './payDates';

// Shared types and status logic for the payment tracker (server and pages).

export type PayJob = {
  id: string; business_id: string; created_at: string; archived_at: string | null;
  name: string; contractor: string; contractor_contact: string | null; contractor_address: string | null; contract_ref: string | null;
  contract_sum: number | null;
  terms: 'scheme' | 'custom'; due_days: number; final_days: number; notice_days: number; payless_days: number; exclude_holidays: boolean;
  retention_pct: number; retention_override: number | null; first_release_pct: number;
  pc_date: string | null; dlp_months: number;
  first_released_on: string | null; first_released_amount: number | null;
  second_released_on: string | null; second_released_amount: number | null;
  notes: string | null;
};

export type PayApp = {
  id: string; job_id: string; business_id: string; created_at: string; number: number;
  period_end: string | null; applied_on: string; gross_to_date: number | null; amount_applied: number;
  payment_notice_on: string | null; amount_notified: number | null;
  payless_on: string | null; amount_payless: number | null;
  paid_on: string | null; amount_paid: number | null; notes: string | null;
};

const n = (v: unknown) => (v == null ? null : Number(v));

/** Supabase returns numeric columns as strings; make them numbers. */
export function cleanJob(r: Record<string, unknown>): PayJob {
  return {
    ...(r as unknown as PayJob),
    contract_sum: n(r.contract_sum), retention_pct: Number(r.retention_pct ?? 0), retention_override: n(r.retention_override),
    first_release_pct: Number(r.first_release_pct ?? 50), first_released_amount: n(r.first_released_amount), second_released_amount: n(r.second_released_amount),
  };
}
export function cleanApp(r: Record<string, unknown>): PayApp {
  return {
    ...(r as unknown as PayApp),
    gross_to_date: n(r.gross_to_date), amount_applied: Number(r.amount_applied), amount_notified: n(r.amount_notified),
    amount_payless: n(r.amount_payless), amount_paid: n(r.amount_paid),
  };
}

export const termsOf = (j: PayJob): Terms => ({
  mode: j.terms, dueDays: j.due_days, finalDays: j.final_days, noticeDays: j.notice_days, paylessDays: j.payless_days, excludeHolidays: j.exclude_holidays,
});

export const datesFor = (j: PayJob, a: PayApp): KeyDates => keyDates(termsOf(j), a.applied_on, a.period_end);

/** The sum the payer must pay: the pay less amount, else their payment notice, else the application. */
export const sumDue = (a: PayApp) => a.amount_payless ?? a.amount_notified ?? a.amount_applied;

export type AppStatus = {
  tone: 'ok' | 'warn' | 'bad' | 'neutral';
  label: string;
  /** the next date to watch, and what it is */
  next: { date: string; what: string } | null;
  outstanding: number;
  overdue: boolean;
};

export function appStatus(j: PayJob, a: PayApp, today: string): AppStatus {
  const d = datesFor(j, a);
  const due = sumDue(a);
  const paid = a.amount_paid ?? 0;
  if (a.paid_on) {
    const short = Math.round((due - paid) * 100) / 100;
    if (short > 0.009) return { tone: 'warn', label: 'Paid short', next: null, outstanding: short, overdue: a.paid_on > d.finalDate };
    return { tone: 'ok', label: a.paid_on > d.finalDate ? 'Paid late' : 'Paid', next: null, outstanding: 0, overdue: false };
  }
  if (today > d.finalDate) return { tone: 'bad', label: 'Overdue', next: { date: d.finalDate, what: 'Final date passed' }, outstanding: due, overdue: true };
  if (!a.payment_notice_on && today > d.paymentNoticeBy) {
    return { tone: 'warn', label: 'No payment notice', next: { date: d.finalDate, what: 'Final date for payment' }, outstanding: due, overdue: false };
  }
  if (!a.payment_notice_on) return { tone: 'neutral', label: 'Waiting for payment notice', next: { date: d.paymentNoticeBy, what: 'Payment notice due by' }, outstanding: due, overdue: false };
  if (!a.payless_on && today <= d.paylessBy) return { tone: 'neutral', label: 'Notice received', next: { date: d.paylessBy, what: 'Last day for pay less notice' }, outstanding: due, overdue: false };
  return { tone: 'neutral', label: 'Waiting for payment', next: { date: d.finalDate, what: 'Final date for payment' }, outstanding: due, overdue: false };
}

// ---------------------------------------------------------------
// Retentions
// ---------------------------------------------------------------
export type Retention = {
  held: number;
  firstAmount: number;
  secondAmount: number;
  firstDue: string | null;
  secondDue: string | null;
  firstOutstanding: number;
  secondOutstanding: number;
  status: { tone: 'ok' | 'warn' | 'bad' | 'neutral'; label: string };
};

const addMonths = (s: string, m: number) => {
  const d = new Date(`${s}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + m);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return iso(d);
};

export function retentionFor(j: PayJob, apps: PayApp[], today: string): Retention | null {
  if (!j.retention_pct && j.retention_override == null) return null;
  const latestGross = [...apps].sort((x, y) => y.number - x.number).find((a) => a.gross_to_date != null)?.gross_to_date ?? null;
  const held = j.retention_override ?? (latestGross != null ? Math.round(latestGross * j.retention_pct) / 100 : 0);
  const firstAmount = Math.round(held * j.first_release_pct) / 100;
  const secondAmount = Math.round((held - firstAmount) * 100) / 100;
  const firstDue = j.pc_date;
  const secondDue = j.pc_date ? addMonths(j.pc_date, j.dlp_months) : null;
  const firstOutstanding = j.first_released_on ? Math.max(0, firstAmount - (j.first_released_amount ?? firstAmount)) : firstAmount;
  const secondOutstanding = j.second_released_on ? Math.max(0, secondAmount - (j.second_released_amount ?? secondAmount)) : secondAmount;
  let status: Retention['status'] = { tone: 'neutral', label: 'Held until practical completion' };
  if (firstDue && !j.first_released_on && today >= firstDue) status = { tone: daysFrom(firstDue, today) > 30 ? 'bad' : 'warn', label: 'First half due (practical completion)' };
  else if (secondDue && !j.second_released_on && today >= secondDue) status = { tone: daysFrom(secondDue, today) > 30 ? 'bad' : 'warn', label: 'Second half due (end of defects period)' };
  else if (j.second_released_on) status = { tone: 'ok', label: 'Fully released' };
  else if (j.first_released_on) status = { tone: 'neutral', label: `First half released; rest due ${secondDue ?? 'after defects period'}` };
  return { held, firstAmount, secondAmount, firstDue, secondDue, firstOutstanding, secondOutstanding, status };
}

