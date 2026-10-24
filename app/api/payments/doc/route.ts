import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { packOwner } from '@/lib/compliance';
import { cleanJob, cleanApp, datesFor, sumDue, retentionFor, appStatus } from '@/lib/payments';
import { money, ukDay, todayUK, lateInterest, addDays } from '@/lib/payDates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const lines = (s: string | null | undefined) => (s ? esc(s).replace(/\n/g, '<br>') : '');
const longDate = (s: string) => new Date(`${s}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const isId = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

/** Notice letters as Word documents, filled in from the tracker. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const bid = sp.get('b') ?? '';
  const ref = sp.get('id') ?? '';
  const kind = sp.get('kind') ?? '';
  if (!isId(bid) || !isId(ref)) return new NextResponse('Not found', { status: 404 });
  const own = await packOwner(bid);
  if (!own.ok) return NextResponse.redirect(new URL(own.status === 401 ? '/login' : `/account/${bid}`, req.url), 303);
  const b = own.business;
  const today = todayUK();

  let jobRow: Record<string, unknown> | null = null;
  let appRow: Record<string, unknown> | null = null;
  if (kind === 'retention') {
    ({ data: jobRow } = await db().from('pay_jobs').select('*').eq('id', ref).eq('business_id', bid).maybeSingle());
  } else {
    ({ data: appRow } = await db().from('pay_apps').select('*').eq('id', ref).eq('business_id', bid).maybeSingle());
    if (appRow) ({ data: jobRow } = await db().from('pay_jobs').select('*').eq('id', appRow.job_id as string).eq('business_id', bid).maybeSingle());
  }
  if (!jobRow) return new NextResponse('Not found', { status: 404 });
  const j = cleanJob(jobRow);
  const a = appRow ? cleanApp(appRow) : null;

  const sender = `<p><b>${esc(b.trading_name)}</b><br>${lines(b.business_address ?? '')}${b.business_address ? '<br>' : ''}${esc(b.phone ?? '')} &middot; ${esc(b.email)}</p>`;
  const to = `<p>${j.contractor_contact ? `${esc(j.contractor_contact)}<br>` : ''}<b>${esc(j.contractor)}</b><br>${lines(j.contractor_address)}</p>`;
  const reLine = `${esc(j.name)}${j.contract_ref ? `, subcontract ref. ${esc(j.contract_ref)}` : ''}`;
  const signOff = `<p>Yours faithfully,</p><p><br><br>${esc(b.contact_name ?? '')}<br>For and on behalf of ${esc(b.trading_name)}</p>`;
  const terms = j.terms === 'scheme'
    ? 'the Scheme for Construction Contracts (England and Wales) Regulations 1998 (as amended), which apply because the subcontract does not contain compliant payment terms'
    : 'the payment terms of the subcontract';

  let title = '';
  let body = '';
  let file = '';

  if (a) {
    const d = datesFor(j, a);
    const due = sumDue(a);
    if (kind === 'application') {
      title = `Payment application no. ${a.number}`;
      file = `Application ${a.number} ${j.name}`;
      body = `<p>We apply for payment for the work carried out${a.period_end ? ` up to ${longDate(a.period_end)}` : ''}, as follows:</p>
<table><tr><th>Gross valuation to date</th><td>${a.gross_to_date != null ? money(a.gross_to_date) : '[gross valuation]'}</td></tr>
<tr><th>Less retention${j.retention_pct ? ` at ${j.retention_pct}%` : ''}</th><td>[retention]</td></tr>
<tr><th>Less previous payments</th><td>[previous payments]</td></tr>
<tr><th>Amount applied for</th><td><b>${money(a.amount_applied)}</b> (plus VAT where applicable)</td></tr></table>
<p>A breakdown is attached. Under ${terms}:</p>
<ul><li>the payment due date is <b>${longDate(d.due)}</b>;</li>
<li>your payment notice, stating the sum you consider due and how it is calculated, must be given by <b>${longDate(d.paymentNoticeBy)}</b>;</li>
<li>any pay less notice must be given by <b>${longDate(d.paylessBy)}</b>; and</li>
<li>the final date for payment is <b>${longDate(d.finalDate)}</b>.</li></ul>
<p>If no payment notice is given, this application stands as notice of the sum due under section 110B of the Housing Grants, Construction and Regeneration Act 1996.</p>`;
    } else if (kind === 'default-notice') {
      title = 'Notice of the sum considered due (section 110B, Housing Grants, Construction and Regeneration Act 1996)';
      file = `Notice of sum due app ${a.number} ${j.name}`;
      body = `<p>We refer to our payment application no. ${a.number} dated ${longDate(a.applied_on)}.</p>
<p>The payment due date was ${longDate(d.due)}. No payment notice was given by ${longDate(d.paymentNoticeBy)}, the last date for doing so.</p>
<p>Our application was made in accordance with the subcontract and therefore stands as the notice of the sum due. For the avoidance of doubt, we give notice under section 110B(2) of the Act that the sum we consider to be due at the payment due date is <b>${money(a.amount_applied)}</b> (plus VAT where applicable), calculated as set out in our application and the attached breakdown.</p>
<p>This sum must be paid by the final date for payment, <b>${longDate(d.finalDate)}</b>, unless a valid pay less notice is given by ${longDate(d.paylessBy)}.</p>`;
    } else if (kind === 'suspension') {
      const s = appStatus(j, a, today);
      const earliest = addDays(today, 7, true);
      const from = earliest > d.suspendFrom ? earliest : d.suspendFrom;
      title = 'Notice of intention to suspend performance (section 112, Housing Grants, Construction and Regeneration Act 1996)';
      file = `Notice of intention to suspend app ${a.number} ${j.name}`;
      body = `<p>We refer to our payment application no. ${a.number} dated ${longDate(a.applied_on)}.</p>
<p>The sum due of <b>${money(due)}</b> was not paid in full by the final date for payment, ${longDate(d.finalDate)}. ${s.outstanding < due ? `${money(s.outstanding)} remains unpaid.` : 'It remains unpaid.'}</p>
<p>We give notice under section 112 of the Act that, unless the sum due is paid in full, we intend to suspend performance of <b>all of our obligations</b> under the subcontract from <b>${longDate(from)}</b>, which is at least 7 days after this notice.</p>
<p>The ground for the suspension is the failure to pay the sum due in full by the final date for payment.</p>
<p>Any suspension will end when payment of the sum due is made in full. Under section 112 of the Act you will be liable to pay us a reasonable amount for the costs and expenses we incur as a result of the suspension, and the period of suspension, together with the time needed to remobilise, will be added to the time for completing our works.</p>`;
    } else if (kind === 'interest') {
      const baseRate = Number(process.env.LATE_PAYMENT_BASE_RATE || 3.75);
      const s = appStatus(j, a, today);
      const debt = a.paid_on ? due : s.outstanding;
      const until = a.paid_on ?? today;
      const li = lateInterest(debt, addDays(d.finalDate, 1, false), until, baseRate);
      title = 'Claim for statutory interest and compensation (Late Payment of Commercial Debts (Interest) Act 1998)';
      file = `Late payment interest app ${a.number} ${j.name}`;
      body = `<p>We refer to our payment application no. ${a.number} dated ${longDate(a.applied_on)}. The sum of ${money(debt)} was due by the final date for payment, ${longDate(d.finalDate)}, and ${a.paid_on ? `was paid on ${longDate(a.paid_on)}` : 'has not been paid'}.</p>
<p>The subcontract does not provide a substantial remedy for late payment, so statutory interest applies. We claim:</p>
<table><tr><th>Statutory interest at ${li.rate}% a year (8% over the Bank of England reference rate of ${baseRate}%) on ${money(debt)} for ${li.days} days, ${longDate(addDays(d.finalDate, 1, false))} to ${longDate(until)}</th><td>${money(li.interest)}</td></tr>
<tr><th>Fixed compensation (section 5A)</th><td>${money(li.compensation)}</td></tr>
<tr><th>Total claimed</th><td><b>${money(li.interest + li.compensation)}</b></td></tr></table>
${a.paid_on ? '' : `<p>Interest continues to run at ${money(li.daily)} a day until payment is made.</p>`}
<p>Please pay this sum within 14 days.</p>`;
    }
  } else if (kind === 'retention') {
    const { data: appRows } = await db().from('pay_apps').select('*').eq('job_id', j.id);
    const ret = retentionFor(j, (appRows ?? []).map(cleanApp), today);
    if (ret) {
      const second = !!j.first_released_on || (ret.secondDue != null && today >= ret.secondDue);
      const amount = second ? ret.secondOutstanding : ret.firstOutstanding;
      const when = second ? ret.secondDue : ret.firstDue;
      title = `Request for release of retention${second ? ' (second half)' : ' (first half)'}`;
      file = `Retention release ${j.name}`;
      body = `<p>${second
        ? `The defects liability period of ${j.dlp_months} months following practical completion${j.pc_date ? ` on ${longDate(j.pc_date)}` : ''} ${when ? `ended on ${longDate(when)}` : 'has ended'}.`
        : `Practical completion of our works was achieved${j.pc_date ? ` on ${longDate(j.pc_date)}` : ''}.`}</p>
<p>Under the subcontract, ${second ? 'the balance of the retention' : `${j.first_release_pct}% of the retention`} is now due for release. We request payment of <b>${money(amount)}</b> (plus VAT where applicable).</p>
<p>Please confirm the date this will be paid, or let us know by return if you consider any defects remain outstanding so that we can attend to them.</p>`;
    }
  }
  if (!body) return new NextResponse('That letter is not available for this item.', { status: 404 });

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>body{font-family:Arial,sans-serif;font-size:11pt;color:#1b1f1c}h1{font-size:14pt;color:#12361f}table{border-collapse:collapse;width:100%;margin:6pt 0}th,td{border:1px solid #999;padding:4pt 6pt;vertical-align:top;font-size:10.5pt;text-align:left}th{background:#f2f2f2;font-weight:normal}
.note{background:#fff4e0;border:1px solid #e0c48a;padding:6pt;font-size:9.5pt}</style></head><body>
<p class="note">Prepared with The Little Green Book from the dates and amounts in your payment tracker. Check it against your subcontract, fill in anything in [square brackets], and delete this box before sending. Send it in the way the subcontract requires for notices (usually email to a named address and/or post). This is not legal advice; for suspension or adjudication take advice first.</p>
${sender}
<p>${longDate(today)}</p>
${to}
<p>Dear Sirs,</p>
<h1>${esc(title)}</h1>
<p><b>${reLine}</b></p>
${body}
${signOff}
</body></html>`;
  const name = `${file.replace(/[^A-Za-z0-9 ]+/g, '').trim().slice(0, 80) || 'Notice'}.doc`;
  return new NextResponse(html, {
    headers: { 'content-type': 'application/msword; charset=utf-8', 'content-disposition': `attachment; filename="${name}"`, 'cache-control': 'private, no-store' },
  });
}
