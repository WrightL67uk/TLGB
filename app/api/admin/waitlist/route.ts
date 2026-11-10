import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { setComingSoon } from '@/lib/launch';

export const runtime = 'nodejs';

// Behind the admin password (middleware).
const csv = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : s;
};

/** Download the waiting list as a spreadsheet (CSV). */
export async function GET() {
  const { data } = await db().from('waitlist').select('created_at, name, business_name, email, phone, code_sent_at').order('created_at').limit(20000);
  const rows = [['Joined', 'Name', 'Business', 'Email', 'Phone', 'Code sent'], ...(data ?? []).map((r) => [
    r.created_at.slice(0, 16).replace('T', ' '), r.name, r.business_name, r.email, r.phone, r.code_sent_at?.slice(0, 10) ?? '',
  ])];
  return new NextResponse(rows.map((r) => r.map(csv).join(',')).join('\r\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="tlgb-waiting-list-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}

/** Switch the coming soon homepage on or off, or remove someone from the list. */
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const back = (q: string) => NextResponse.redirect(new URL(`/admin/waitlist?${q}`, req.url), 303);
  if (!fd) return back('error=Nothing+was+sent');
  const action = String(fd.get('action') ?? '');
  if (action === 'on' || action === 'off') {
    const { error } = await setComingSoon(action === 'on');
    return back(error ? 'error=Could+not+save' : `saved=${action}`);
  }
  if (action === 'remove') {
    const id = String(fd.get('id') ?? '');
    if (!/^[0-9a-f-]{36}$/.test(id)) return back('error=Not+found');
    await db().from('waitlist').delete().eq('id', id);
    return back('removed=1');
  }
  return back('error=Unknown+action');
}
