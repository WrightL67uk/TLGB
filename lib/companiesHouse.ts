import 'server-only';
import { env } from './config';

const BASE = 'https://api.company-information.service.gov.uk';

export type CompanyCheck =
  | {
      ok: true;
      companyNumber: string;
      name: string;
      status: string;
      incorporatedOn: string | null;
      registeredAddress: string;
      type: string;
      raw: unknown;
    }
  | { ok: false; reason: string };

/** Company numbers are 8 chars; pad numeric ones (e.g. 1234567 -> 01234567). */
export function normaliseCompanyNumber(input: string): string {
  const s = input.trim().toUpperCase().replace(/\s+/g, '');
  return /^\d+$/.test(s) ? s.padStart(8, '0') : s;
}

function authHeader() {
  return 'Basic ' + Buffer.from(env('COMPANIES_HOUSE_API_KEY') + ':').toString('base64');
}

export async function checkCompany(rawNumber: string): Promise<CompanyCheck> {
  const number = normaliseCompanyNumber(rawNumber);
  if (!/^[A-Z0-9]{8}$/.test(number)) {
    return { ok: false, reason: 'That does not look like a valid company number.' };
  }

  const res = await fetch(`${BASE}/company/${encodeURIComponent(number)}`, {
    headers: { Authorization: authHeader() },
    cache: 'no-store',
  });

  if (res.status === 404) return { ok: false, reason: 'No company found with that number.' };
  if (!res.ok) return { ok: false, reason: `Companies House lookup failed (${res.status}). Try again shortly.` };

  const c = await res.json();
  const a = c.registered_office_address ?? {};
  const address = [a.address_line_1, a.address_line_2, a.locality, a.region, a.postal_code]
    .filter(Boolean)
    .join(', ');

  if (c.company_status !== 'active') {
    return { ok: false, reason: `Companies House shows this company as "${c.company_status}". Only active companies can be listed.` };
  }

  return {
    ok: true,
    companyNumber: c.company_number,
    name: c.company_name,
    status: c.company_status,
    incorporatedOn: c.date_of_creation ?? null,
    registeredAddress: address,
    type: c.type,
    raw: c,
  };
}
