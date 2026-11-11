import 'server-only';
import { createHash, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';

/**
 * Read-only access for Claude, so the site's data can be looked at without a browser.
 * Only the SHA-256 hash of the key lives here; the key itself is held by Claude.
 * To turn access off, set this to ''. To change the key, replace the hash and redeploy.
 */
const KEY_HASH = '6f602c38291eb6df242d62aa45c1fa921d68765a780ae393f0cf85dfe4d5b89a';

export function claudeAllowed(req: NextRequest) {
  if (!KEY_HASH) return false;
  const given = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!given) return false;
  const a = Buffer.from(createHash('sha256').update(given).digest('hex'));
  const b = Buffer.from(KEY_HASH);
  const ok = a.length === b.length && timingSafeEqual(a, b);
  console.log(`claude-access ${ok ? 'ok' : 'refused'} ${req.nextUrl.pathname}${req.nextUrl.search}`);
  return ok;
}

/** Tables Claude may read. Login tokens, sessions and payment events are never readable. */
export const READABLE = new Set([
  'trade_categories', 'businesses', 'business_documents', 'business_photos', 'review_events', 'expiry_notices', 'leads',
  'suppliers', 'help_requests', 'service_enquiries', 'compliance_docs', 'pack_links', 'pack_events', 'pqq_answers', 'pqq_projects',
  'contractor_companies', 'contractor_users', 'contractor_favourites', 'contractor_lists', 'contractor_list_items',
  'contractor_jobs', 'contractor_job_files', 'contractor_job_invites', 'contractor_job_replies', 'contractor_job_reports',
  'pay_jobs', 'pay_apps', 'team_people', 'team_quals', 'shortlist_watch', 'job_seekers',
  'quote_requests', 'quote_lines', 'quote_invites', 'quote_prices', 'supplier_ratings', 'member_sites', 'site_enquiries',
  'waitlist', 'site_settings', 'vacancies', 'recruit_alerts',
]);

/** Columns never returned, whatever table they are in. */
export const HIDDEN_COLUMNS = new Set(['token_hash', 'share_token', 'token', 'ip_hash']);
