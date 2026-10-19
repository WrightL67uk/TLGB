// Expiry dates for insurance and accreditations, shared by forms, pages and the daily reminder job.
import { ACCREDITATIONS_WITHOUT_EXPIRY } from './config';

export type Expiries = Record<string, string>; // accreditation name -> YYYY-MM-DD

export type ExpiryItem = { key: string; label: string; expiry: string };
export type Stage = '30d' | '7d' | 'expired';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const todayISO = () => new Date().toISOString().slice(0, 10);

/** Whole days from today until the date. Negative once it has passed. */
export function daysUntil(date: string) {
  const ms = Date.parse(`${date}T00:00:00Z`) - Date.parse(`${todayISO()}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** Which reminder applies today, if any. Only the most urgent one is sent. */
export function stageFor(days: number): Stage | null {
  if (days < 0) return 'expired';
  if (days <= 7) return '7d';
  if (days <= 30) return '30d';
  return null;
}

export const needsExpiry = (name: string) => !(ACCREDITATIONS_WITHOUT_EXPIRY as readonly string[]).includes(name);

/**
 * Checks the expiry dates sent with a form against the accreditations ticked.
 * Returns the cleaned map (only ticked ones) or an error message.
 */
export function cleanAccreditationExpiries(
  accreditations: string[],
  raw: unknown,
  opts: { allowPast?: boolean } = {}
): { ok: true; value: Expiries } | { ok: false; error: string } {
  const input = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out: Expiries = {};
  const today = todayISO();
  for (const a of accreditations) {
    const v = typeof input[a] === 'string' ? (input[a] as string).trim() : '';
    if (!v) {
      if (needsExpiry(a)) return { ok: false, error: `${a}: enter the expiry date shown on the certificate.` };
      continue;
    }
    if (!DATE.test(v)) return { ok: false, error: `${a}: enter a valid expiry date.` };
    if (!opts.allowPast && v < today) return { ok: false, error: `${a} has expired. Renew it, or untick it for now.` };
    out[a] = v;
  }
  return { ok: true, value: out };
}

/** Accreditations that are still in date (or have no expiry). Expired ones are hidden from buyers. */
export function liveAccreditations(accreditations: string[], expiries: Expiries | null | undefined) {
  const today = todayISO();
  return accreditations.filter((a) => !expiries?.[a] || expiries[a] >= today);
}

/** Everything on a listing that has an expiry date. */
export function expiryItems(b: {
  pl_expiry: string | null;
  el_expiry: string | null;
  el_cover_amount: number | null;
  accreditations: string[];
  accreditation_expiries: Expiries | null;
}): ExpiryItem[] {
  const items: ExpiryItem[] = [];
  if (b.pl_expiry) items.push({ key: 'public_liability', label: 'Public liability insurance', expiry: b.pl_expiry });
  if (b.el_expiry && b.el_cover_amount) items.push({ key: 'employers_liability', label: 'Employers liability insurance', expiry: b.el_expiry });
  for (const a of b.accreditations) {
    const e = b.accreditation_expiries?.[a];
    if (e) items.push({ key: `acc:${a}`, label: a, expiry: e });
  }
  return items;
}

export const fmtDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC' });
