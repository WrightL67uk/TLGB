import { NextRequest, NextResponse } from 'next/server';
import { runExpiryJob } from '@/lib/expiryJob';
import { importLeads } from '@/lib/leads';

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
  return NextResponse.json({ ok: true, ...out });
}
