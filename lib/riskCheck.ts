import 'server-only';
import { env } from './config';
import { db } from './supabase';

// Free risk check on a limited company from Companies House: the public signs that often go with
// payment trouble. Not a credit score and no CCJ data; those need a paid bureau. Result is stored on
// the business, shown to admin only, and the admin is emailed when it is red.

const BASE = 'https://api.company-information.service.gov.uk';
const auth = () => 'Basic ' + Buffer.from(env('COMPANIES_HOUSE_API_KEY') + ':').toString('base64');

export type RiskLevel = 'green' | 'amber' | 'red';
export type RiskFlag = { level: 'amber' | 'red'; text: string };
export type RiskCheck = {
  level: RiskLevel;
  flags: RiskFlag[];
  facts: Record<string, string | number | boolean | null>;
  checkedAt: string;
  error?: string;
};

async function get(path: string) {
  const r = await fetch(`${BASE}${path}`, { headers: { Authorization: auth() }, cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Companies House ${r.status} for ${path}`);
  return r.json();
}

const monthsAgo = (iso: string | null | undefined) => (iso ? (Date.now() - new Date(iso).getTime()) / (30.44 * 86400000) : null);
const fmt = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/** Runs the check. Never throws: an API problem comes back as a green result with `error` set. */
export async function riskCheck(companyNumber: string): Promise<RiskCheck> {
  const flags: RiskFlag[] = [];
  const facts: RiskCheck['facts'] = {};
  const checkedAt = new Date().toISOString();
  try {
    const n = encodeURIComponent(companyNumber);
    const [c, officers, charges, filings] = await Promise.all([
      get(`/company/${n}`),
      get(`/company/${n}/officers?items_per_page=50`),
      get(`/company/${n}/charges`),
      get(`/company/${n}/filing-history?items_per_page=40`),
    ]);
    if (!c) return { level: 'red', flags: [{ level: 'red', text: 'Company number not found at Companies House' }], facts, checkedAt };

    // Status
    facts.status = c.company_status;
    if (c.company_status !== 'active') flags.push({ level: 'red', text: `Company status is "${c.company_status}"` });
    if (c.company_status_detail) facts.statusDetail = c.company_status_detail;
    if (c.has_insolvency_history) flags.push({ level: 'red', text: 'Companies House shows insolvency history' });
    if (c.undeliverable_registered_office_address) flags.push({ level: 'amber', text: 'Registered office post is being returned undelivered' });
    if (c.registered_office_is_in_dispute) flags.push({ level: 'amber', text: 'Registered office address is in dispute' });

    // Filing discipline
    if (c.accounts?.overdue) flags.push({ level: 'red', text: `Accounts overdue (were due ${fmt(c.accounts?.next_due)})` });
    if (c.confirmation_statement?.overdue) flags.push({ level: 'amber', text: `Confirmation statement overdue (due ${fmt(c.confirmation_statement?.next_due)})` });
    facts.lastAccounts = c.accounts?.last_accounts?.made_up_to ?? null;
    facts.accountsType = c.accounts?.last_accounts?.type ?? null;
    if (c.accounts?.last_accounts?.type === 'dormant') flags.push({ level: 'amber', text: 'Last accounts filed as dormant' });

    // Age
    const age = monthsAgo(c.date_of_creation);
    facts.incorporated = c.date_of_creation ?? null;
    if (age !== null && age < 12) flags.push({ level: 'amber', text: `Incorporated ${fmt(c.date_of_creation)}, under a year old` });
    else if (age !== null && age < 24) flags.push({ level: 'amber', text: `Incorporated ${fmt(c.date_of_creation)}, under two years old` });

    // Charges (lending secured on the company)
    const items: { status?: string; created_on?: string; delivered_on?: string; satisfied_on?: string }[] = charges?.items ?? [];
    const outstanding = items.filter((x) => x.status === 'outstanding' || x.status === 'part-satisfied');
    const recent = outstanding.filter((x) => (monthsAgo(x.created_on || x.delivered_on) ?? 99) < 12);
    facts.chargesOutstanding = outstanding.length;
    if (outstanding.length >= 3) flags.push({ level: 'amber', text: `${outstanding.length} outstanding charges registered` });
    if (recent.length) flags.push({ level: 'amber', text: `${recent.length} new charge${recent.length > 1 ? 's' : ''} registered in the last 12 months` });

    // Officers: churn and a one-person board
    const offs: { resigned_on?: string; appointed_on?: string; officer_role?: string }[] = officers?.items ?? [];
    const active = offs.filter((o) => !o.resigned_on && /director/i.test(o.officer_role ?? ''));
    const resigned12 = offs.filter((o) => o.resigned_on && (monthsAgo(o.resigned_on) ?? 99) < 12);
    const appointed12 = offs.filter((o) => o.appointed_on && !o.resigned_on && (monthsAgo(o.appointed_on) ?? 99) < 12);
    facts.activeDirectors = active.length;
    facts.resignedLast12m = resigned12.length;
    if (active.length === 0) flags.push({ level: 'red', text: 'No active director on the register' });
    if (resigned12.length >= 2) flags.push({ level: 'amber', text: `${resigned12.length} directors resigned in the last 12 months` });
    if (age !== null && age > 24 && appointed12.length && active.length === appointed12.length) flags.push({ level: 'amber', text: 'Every current director was appointed in the last 12 months (possible change of ownership)' });

    // Filing history: strike-off action, name changes, address changes
    const fh: { type?: string; category?: string; date?: string; description?: string }[] = filings?.items ?? [];
    const last24 = fh.filter((f) => (monthsAgo(f.date) ?? 99) < 24);
    const gazette = last24.filter((f) => /gazette|strike|dissolution/i.test((f.type ?? '') + ' ' + (f.description ?? '')));
    const struckOffPending = gazette.some((f) => /^GAZ1|first-gazette|strike-off-action|dissolution-notice/i.test((f.type ?? '') + ' ' + (f.description ?? '')));
    const discontinued = gazette.some((f) => /DISS40|discontinued|withdrawn|suspended/i.test((f.type ?? '') + ' ' + (f.description ?? '')));
    if (struckOffPending) flags.push({ level: discontinued ? 'amber' : 'red', text: discontinued ? 'Strike-off action started in the last two years, later discontinued' : 'Strike-off action (first Gazette notice) in the last two years' });
    const nameChanges = last24.filter((f) => f.category === 'change-of-name' || /change-of-name/i.test(f.type ?? ''));
    if (nameChanges.length) flags.push({ level: 'amber', text: `Company name changed ${nameChanges.length === 1 ? 'once' : nameChanges.length + ' times'} in the last two years` });
    const addrChanges = last24.filter((f) => /AD01|registered-office-address/i.test((f.type ?? '') + ' ' + (f.description ?? '')));
    if (addrChanges.length >= 2) flags.push({ level: 'amber', text: `Registered office moved ${addrChanges.length} times in the last two years` });
    const lateAccounts = fh.filter((f) => f.category === 'accounts' && /late|penalt/i.test(f.description ?? ''));
    if (lateAccounts.length) flags.push({ level: 'amber', text: 'Previous late filing of accounts' });

    const level: RiskLevel = flags.some((f) => f.level === 'red') ? 'red' : flags.filter((f) => f.level === 'amber').length >= 2 ? 'amber' : flags.length ? 'amber' : 'green';
    return { level, flags, facts, checkedAt };
  } catch (e) {
    return { level: 'green', flags: [], facts, checkedAt, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Runs the check for one business and stores it. Returns the result, and whether it got worse than last time. */
export async function checkBusiness(id: string, companyNumber: string) {
  const prev = (await db().from('businesses').select('risk_level').eq('id', id).maybeSingle()).data?.risk_level as RiskLevel | null | undefined;
  const r = await riskCheck(companyNumber);
  const rank = { green: 0, amber: 1, red: 2 };
  const worse = prev ? rank[r.level] > rank[prev] : r.level !== 'green';
  // If the columns are not there yet (migration not run) this fails quietly; the application still goes through.
  const { error } = await db().from('businesses').update({ risk_level: r.level, risk_check: r, risk_checked_at: r.checkedAt }).eq('id', id);
  if (error) console.error('risk check save failed', error.message);
  return { result: r, worse };
}

/** Weekly: recheck every listed limited company and report the ones that got worse. */
export async function runRiskRechecks() {
  const { data } = await db().from('businesses').select('id, trading_name, company_number, risk_level').eq('business_type', 'ltd').in('status', ['approved', 'pending', 'started']).not('company_number', 'is', null).limit(400);
  const worsened: { id: string; name: string; from: string; to: string; flags: string[] }[] = [];
  for (const b of data ?? []) {
    const { result, worse } = await checkBusiness(b.id as string, b.company_number as string);
    if (worse && result.level !== 'green') worsened.push({ id: b.id as string, name: b.trading_name as string, from: (b.risk_level as string) ?? 'unchecked', to: result.level, flags: result.flags.map((f) => f.text) });
    await new Promise((r) => setTimeout(r, 250)); // stay well inside Companies House rate limits
  }
  return { checked: (data ?? []).length, worsened };
}
