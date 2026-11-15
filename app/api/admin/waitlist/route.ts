import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { setComingSoon } from '@/lib/launch';
import { findCode, usable, describe } from '@/lib/discounts';
import { emailWaitlistInvite } from '@/lib/email';
import { TYPE_LABEL, type MemberType } from '@/lib/waitlistType';

export const runtime = 'nodejs';
export const maxDuration = 300;

// Behind the admin password (middleware).
const csv = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : s;
};

/** Download the waiting list as a spreadsheet (CSV). */
export async function GET() {
  const { data } = await db().from('waitlist').select('created_at, name, business_name, email, phone, code_sent_at, member_type, source').order('created_at').limit(20000);
  const rows = [['Joined', 'Type', 'Name', 'Business', 'Email', 'Phone', 'Came from', 'Code sent'], ...(data ?? []).map((r) => [
    r.created_at.slice(0, 16).replace('T', ' '), r.member_type ? TYPE_LABEL[r.member_type as MemberType] : '', r.name, r.business_name, r.email, r.phone, r.source === 'qr' ? 'QR code' : r.source ?? '', r.code_sent_at?.slice(0, 10) ?? '',
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
  if (action === 'invite_test') {
    // Sends the real invite to one address only, so it can be checked. Nobody on the list is marked as sent.
    const to = String(fd.get('test_email') ?? '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(to)) return back('error=' + encodeURIComponent('Enter the email address to send the test to.'));
    const found = await findCode(String(fd.get('code') ?? ''));
    if (!found) return back('error=' + encodeURIComponent('That code does not exist. Create it in Discount codes first.'));
    const who = String(fd.get('who') ?? 'trade') === 'supplier' ? 'supplier' : 'trade';
    try {
      await emailWaitlistInvite(to, 'Test', who, found.code.code, describe(found.code));
    } catch (e) {
      console.error('waitlist test invite failed', e);
      return back('error=' + encodeURIComponent('The test email could not be sent.'));
    }
    return back('tested=' + encodeURIComponent(to));
  }
  if (action === 'invite') {
    // Emails the launch invite and code to everyone who has not had it yet, 100 at a time.
    if (fd.get('confirm') !== 'yes') return back('error=' + encodeURIComponent('Tick the box to confirm you want to send the emails.'));
    const found = await findCode(String(fd.get('code') ?? ''));
    if (!found) return back('error=' + encodeURIComponent('That code does not exist. Create it in Discount codes first.'));
    if (!usable(found.code, found.uses)) return back('error=' + encodeURIComponent('That code is switched off, expired or used up.'));
    const who = String(fd.get('who') ?? 'all');
    let q = db().from('waitlist').select('id, name, email, member_type').is('code_sent_at', null).order('created_at').limit(100);
    if (who === 'trade') q = q.or('member_type.eq.trade,member_type.is.null');
    if (who === 'supplier') q = q.eq('member_type', 'supplier');
    const { data: rows, error } = await q;
    if (error) return back('error=Could+not+read+the+list');
    let sent = 0;
    for (const r of rows ?? []) {
      try {
        await emailWaitlistInvite(r.email, r.name, r.member_type, found.code.code, describe(found.code));
        await db().from('waitlist').update({ code_sent_at: new Date().toISOString() }).eq('id', r.id);
        sent++;
      } catch (e) { console.error('waitlist invite failed', r.id, e); }
    }
    const { count: left } = await db().from('waitlist').select('id', { count: 'exact', head: true }).is('code_sent_at', null);
    return back(`invited=${sent}&left=${left ?? 0}`);
  }
  return back('error=Unknown+action');
}
