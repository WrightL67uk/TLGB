import { liveAccreditations } from './expiries';
import { unverifiedReason } from './membership';

export type StatusRow = {
  status: string; founding_member: boolean; subscription_status: string;
  pl_expiry: string | null; el_expiry: string | null; el_cover_amount: number | null;
  accreditations: string[]; accreditation_expiries: Record<string, string> | null;
};

const daysTo = (d: string) => Math.ceil((Date.parse(`${d}T00:00:00Z`) - Date.now()) / 86_400_000);

/** What a contractor needs to know about a saved trade's paperwork, as short tags. */
export function tradeWarnings(b: StatusRow): { tone: 'ok' | 'warn' | 'bad'; text: string }[] {
  const out: { tone: 'ok' | 'warn' | 'bad'; text: string }[] = [];
  if (b.status !== 'approved') return [{ tone: 'bad', text: 'No longer listed' }];
  const reason = unverifiedReason(b);
  if (reason === 'membership') out.push({ tone: 'bad', text: 'Unverified: membership lapsed' });
  if (reason === 'insurance') out.push({ tone: 'bad', text: 'Insurance expired' });
  if (!reason) out.push({ tone: 'ok', text: 'Verified' });
  if (b.pl_expiry && !reason) {
    const d = daysTo(b.pl_expiry);
    if (d <= 30) out.push({ tone: 'warn', text: `Public liability expires in ${d} day${d === 1 ? '' : 's'}` });
  }
  if (b.el_expiry && b.el_cover_amount) {
    const d = daysTo(b.el_expiry);
    if (d < 0) out.push({ tone: 'bad', text: 'Employers liability expired' });
    else if (d <= 30) out.push({ tone: 'warn', text: `Employers liability expires in ${d} days` });
  }
  const live = liveAccreditations(b.accreditations, b.accreditation_expiries);
  const lapsed = b.accreditations.filter((a) => !live.includes(a));
  if (lapsed.length) out.push({ tone: 'bad', text: `${lapsed.length} accreditation${lapsed.length === 1 ? '' : 's'} lapsed` });
  for (const a of live) {
    const e = b.accreditation_expiries?.[a];
    if (e && daysTo(e) <= 30) { out.push({ tone: 'warn', text: 'Accreditation expiring soon' }); break; }
  }
  return out;
}
