import { NextRequest, NextResponse } from 'next/server';
import { runExpiryJob } from '@/lib/expiryJob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Runs the expiry reminders on their own (the daily job at /api/cron/daily also runs them). */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, flagged: await runExpiryJob() });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
