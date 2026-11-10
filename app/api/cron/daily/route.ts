import { NextRequest, NextResponse } from 'next/server';
import { runExpiryJob } from '@/lib/expiryJob';
import { importLeads } from '@/lib/leads';
import { geocodeSuppliers } from '@/lib/suppliers';
import { syncOverdueMemberships } from '@/lib/billingSync';
import { runComplianceReminders, runPqqReminders, runDataCleanup } from '@/lib/complianceJob';
import { runPaymentReminders } from '@/lib/paymentJob';
import { runTeamReminders } from '@/lib/teamJob';
import { runShortlistAlerts } from '@/lib/shortlistJob';
import { runSeekerHousekeeping } from '@/lib/seekerJob';
import { runRecruitAlerts } from '@/lib/recruitJob';
import { runQuoteJob } from '@/lib/quoteJob';
import { db } from '@/lib/supabase';
import { runSignupNudges } from '@/lib/nudgeJob';
import { emailAdminJobFailures } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** The one daily job (see vercel.json): fetch new leads, send reminders and alerts, tidy up. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const out: Record<string, unknown> = {};
  const failures: { job: string; error: string }[] = [];
  // Each part runs on its own: one failing does not stop the rest, and failures are emailed to admin.
  const run = async (key: string, job: string, fn: () => Promise<unknown>) => {
    try { out[key] = await fn(); } catch (err) {
      console.error(`daily: ${job} failed`, err);
      out[key] = 'failed';
      failures.push({ job, error: err instanceof Error ? err.message : String(err) });
    }
  };
  await run('leads', 'Fetching tenders (leads)', () => importLeads({ days: Math.min(30, Math.max(1, Number(req.nextUrl.searchParams.get('days')) || 3)) }));
  await run('expiryFlags', 'Insurance and accreditation expiry reminders', runExpiryJob);
  await run('suppliersPlaced', 'Placing suppliers on the map', geocodeSuppliers);
  await run('membershipsSynced', 'Checking memberships with Stripe', syncOverdueMemberships);
  await run('packReminders', 'Compliance pack reminders', runComplianceReminders);
  await run('pqqReminders', 'PQQ reminders', runPqqReminders);
  await run('paymentAlerts', 'Payment tracker alerts', runPaymentReminders);
  await run('teamReminders', 'Team card reminders', runTeamReminders);
  await run('shortlistAlerts', 'Contractor shortlist alerts', runShortlistAlerts);
  await run('seekers', 'Job seeker housekeeping', runSeekerHousekeeping);
  await run('recruit', 'Recruitment match emails', runRecruitAlerts);
  await run('signupNudges', 'Unfinished sign-up reminders', runSignupNudges);
  await run('siteEnquiriesDeleted', 'Clearing old enquiries', async () => {
    const { count, error } = await db().from('site_enquiries').delete({ count: 'exact' }).lt('created_at', new Date(Date.now() - 730 * 86_400_000).toISOString());
    if (error) throw new Error(error.message);
    return count ?? 0;
  });
  await run('quotes', 'Price requests', runQuoteJob);
  await run('cleanup', 'Data clean-up', runDataCleanup);
  if (failures.length) await emailAdminJobFailures(failures).catch((e) => console.error('daily: failure email failed', e));
  return NextResponse.json({ ok: failures.length === 0, ...out });
}
