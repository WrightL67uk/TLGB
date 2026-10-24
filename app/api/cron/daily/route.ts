import { NextRequest, NextResponse } from 'next/server';
import { runExpiryJob } from '@/lib/expiryJob';
import { importLeads } from '@/lib/leads';
import { geocodeSuppliers } from '@/lib/suppliers';
import { syncOverdueMemberships } from '@/lib/billingSync';
import { runComplianceReminders, runPqqReminders, runDataCleanup } from '@/lib/complianceJob';
import { runPaymentReminders } from '@/lib/paymentJob';
import { runTeamReminders } from '@/lib/teamJob';
import { runShortlistAlerts } from '@/lib/shortlistJob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** The one daily job (see vercel.json): fetch new leads, then send expiry reminders. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const out: Record<string, unknown> = {};
  try { out.leads = await importLeads({ days: Math.min(30, Math.max(1, Number(req.nextUrl.searchParams.get('days')) || 3)) }); } catch (err) { console.error('daily: leads failed', err); out.leads = 'failed'; }
  try { out.expiryFlags = await runExpiryJob(); } catch (err) { console.error('daily: expiries failed', err); out.expiryFlags = 'failed'; }
  try { out.suppliersPlaced = await geocodeSuppliers(); } catch (err) { console.error('daily: supplier geocode failed', err); }
  try { out.membershipsSynced = await syncOverdueMemberships(); } catch (err) { console.error('daily: billing sync failed', err); }
  try { out.packReminders = await runComplianceReminders(); } catch (err) { console.error('daily: pack reminders failed', err); }
  try { out.pqqReminders = await runPqqReminders(); } catch (err) { console.error('daily: pqq reminders failed', err); }
  try { out.paymentAlerts = await runPaymentReminders(); } catch (err) { console.error('daily: payment alerts failed', err); }
  try { out.teamReminders = await runTeamReminders(); } catch (err) { console.error('daily: team reminders failed', err); }
  try { out.shortlistAlerts = await runShortlistAlerts(); } catch (err) { console.error('daily: shortlist alerts failed', err); }
  try { out.cleanup = await runDataCleanup(); } catch (err) { console.error('daily: cleanup failed', err); }
  return NextResponse.json({ ok: true, ...out });
}
