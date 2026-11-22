import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export const runtime = 'nodejs';

// Behind the admin password (middleware).
const csv = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : s;
};

/** Download everyone who has confirmed and not unsubscribed, ready to import into an email tool. */
export async function GET() {
  const { data } = await db().from('newsletter_subscribers').select('name, email, consented_at, confirmed_at, source')
    .not('confirmed_at', 'is', null).is('unsubscribed_at', null).order('confirmed_at').limit(50000);
  const rows = [['First name', 'Email', 'Consent given', 'Confirmed', 'Came from'], ...(data ?? []).map((r) => [
    r.name.split(' ')[0], r.email, r.consented_at.slice(0, 16).replace('T', ' '), (r.confirmed_at ?? '').slice(0, 16).replace('T', ' '), r.source ?? '',
  ])];
  return new NextResponse(rows.map((r) => r.map(csv).join(',')).join('\r\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="tlgb-newsletter-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
