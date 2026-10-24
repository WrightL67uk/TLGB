import 'server-only';
import sgMail from '@sendgrid/mail';
import { env, siteUrl, TLGB_EMAIL } from './config';

let ready = false;
function init() {
  if (!ready) {
    sgMail.setApiKey(env('SENDGRID_API_KEY'));
    ready = true;
  }
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

// Deliverability choices made here (see README "Keeping emails out of spam"):
// - Proper HTML document plus a matching plain-text version. HTML-only mail scores worse.
// - Click and open tracking switched off. Tracking rewrites links through a
//   third-party domain and adds a hidden pixel, both of which spam filters dislike
//   and neither of which we need for transactional emails.
// - A real Reply-To mailbox, consistent From name, and a footer saying who we are
//   and why they got the email.
// - Admin emails go one per recipient, so admins never see each other's addresses.

function footer() {
  const addr = process.env.BUSINESS_POSTAL_ADDRESS;
  return `<p style="color:#777;font-size:12px;margin-top:32px;border-top:1px solid #eee;padding-top:12px">
The Little Green Book${addr ? `, ${esc(addr)}` : ''}<br>
You are receiving this because of an account, listing or application on ${esc(siteUrl().replace(/^https?:\/\//, ''))}. <a href="${siteUrl()}/legal/privacy" style="color:#777">Privacy notice</a>
</p>`;
}

function wrap(subject: string, body: string) {
  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:24px;background:#ffffff">
<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a;max-width:560px">
${body}
${footer()}
</div>
</body></html>`;
}

/** Plain-text twin of the HTML. Links become "text (url)". */
function toText(html: string) {
  return html
    .replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function send(to: string | string[], subject: string, body: string, category: string) {
  // Lets the site run for demos before SendGrid is set up: emails are skipped, not crashed on.
  if (!process.env.SENDGRID_API_KEY) {
    console.warn(`Email skipped (SendGrid not configured): ${subject}`);
    return;
  }
  init();
  const html = wrap(subject, body);
  const text = toText(body + footer());
  const recipients = Array.isArray(to) ? to : [to];
  for (const rcpt of recipients) {
    try {
      await sgMail.send({
        to: rcpt,
        from: { email: TLGB_EMAIL, name: 'The Little Green Book' },
        replyTo: TLGB_EMAIL,
        subject,
        html,
        text,
        categories: ['transactional', category],
        trackingSettings: {
          clickTracking: { enable: false, enableText: false },
          openTracking: { enable: false },
        },
      });
    } catch (err) {
      // Never fail the user's request because an email bounced; log it for the admin.
      console.error('SendGrid send failed', subject, err);
    }
  }
}

export type ApplicationSummary = {
  id: string;
  tradingName: string;
  businessType: 'ltd' | 'sole_trader';
  contactName: string;
  email: string;
  companyNumber?: string | null;
  postcode: string;
};

/** Sent to every address in ADMIN_EMAILS each time an application needs approval. */
export async function emailAdminNewApplication(a: ApplicationSummary) {
  const admins = (process.env.ADMIN_EMAILS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const link = `${siteUrl()}/admin/${a.id}`;
  const check =
    a.businessType === 'ltd'
      ? `Limited company ${esc(a.companyNumber ?? '')}, checked as active on Companies House.`
      : 'Sole trader. Letterhead uploaded, needs a manual check.';

  await send(
    admins,
    `Approval needed: ${a.tradingName}`,
    `<p>A new listing is waiting for approval.</p>
<p><strong>${esc(a.tradingName)}</strong><br>
${esc(a.contactName)} (${esc(a.email)})<br>
Base postcode: ${esc(a.postcode)}<br>
${check}</p>
<p><a href="${link}" style="display:inline-block;background:#111;color:#fff;padding:10px 18px;text-decoration:none;border-radius:4px">Review application</a></p>`,
    'admin-approval'
  );
}

export async function emailApplicantReceived(a: ApplicationSummary) {
  await send(
    a.email,
    'We have your application',
    `<p>Hi ${esc(a.contactName)},</p>
<p>Thanks for applying to list <strong>${esc(a.tradingName)}</strong> on The Little Green Book.</p>
<p>We check every business by hand before it goes live, so we will look over your documents and be in touch, usually within two working days.</p>`,
    'application-received'
  );
}

export async function emailApplicantApproved(to: string, name: string, tradingName: string, founding = false) {
  const login = `<a href="${siteUrl()}/login?next=/account">${esc(siteUrl().replace(/^https?:\/\//, ''))}/login</a>`;
  await send(
    to,
    `${tradingName} is approved`,
    founding
      ? `<p>Hi ${esc(name)},</p>
<p>Good news. <strong>${esc(tradingName)}</strong> has been approved and is now listed on The Little Green Book as a founding member, free of charge.</p>
<p>Contractors searching your area can now find you, and you have the full leads feed, the supply chain finder and the help board. Keep your insurance documents up to date so your listing stays live.</p>
<p>Log in with this email address at ${login}.</p>`
      : `<p>Hi ${esc(name)},</p>
<p>Good news. <strong>${esc(tradingName)}</strong> has been approved.</p>
<p>To go live, log in and press <strong>Start membership</strong> on your listing. Once you have paid, contractors searching your area can find you, and you get the full leads feed, the supply chain finder and the help board.</p>
<p>Log in with this email address at ${login}.</p>`,
    'application-approved'
  );
}

export async function emailApplicantRejected(to: string, name: string, tradingName: string, reason: string) {
  await send(
    to,
    `Your application for ${tradingName}`,
    `<p>Hi ${esc(name)},</p>
<p>We could not approve <strong>${esc(tradingName)}</strong> this time.</p>
<p><strong>Reason:</strong> ${esc(reason)}</p>
<p>If you can sort this out, log in at <a href="${siteUrl()}/login">${esc(siteUrl().replace(/^https?:\/\//, ''))}/login</a>
with this email address, update your listing and it will come back to us for another look.</p>`,
    'application-rejected'
  );
}

export async function emailLoginLink(to: string, link: string, minutes: number) {
  await send(
    to,
    'Your login link for The Little Green Book',
    `<p>Here is your link to log in and manage your listing.</p>
<p><a href="${link}" style="display:inline-block;background:#111;color:#fff;padding:10px 18px;text-decoration:none;border-radius:4px">Log in</a></p>
<p>The link works once and expires in ${minutes} minutes. If you did not ask for it, you can ignore this email.</p>`,
    'login-link'
  );
}

/** Tells admins that an approved trade changed something worth checking, or resubmitted after a rejection. */
export async function emailAdminChanges(
  a: { id: string; tradingName: string },
  kind: 'changed' | 'resubmitted',
  detail: string
) {
  const admins = (process.env.ADMIN_EMAILS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const link = `${siteUrl()}/admin/${a.id}`;
  const subject = kind === 'resubmitted' ? `Resubmitted: ${a.tradingName}` : `Changes to check: ${a.tradingName}`;
  const intro =
    kind === 'resubmitted'
      ? 'A trade you rejected has updated their listing and sent it back for review.'
      : 'An approved trade has changed details that need checking. Their listing stays live meanwhile.';
  await send(
    admins,
    subject,
    `<p>${intro}</p>
<p><strong>${esc(a.tradingName)}</strong><br>${esc(detail)}</p>
<p><a href="${link}" style="display:inline-block;background:#111;color:#fff;padding:10px 18px;text-decoration:none;border-radius:4px">Open in admin</a></p>`,
    kind === 'resubmitted' ? 'admin-resubmitted' : 'admin-changes'
  );
}

export type ExpiryNotice = { label: string; expiry: string; stage: '30d' | '7d' | 'expired'; days: number };

const ukDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC' });

/** Daily reminder to a trade about insurance or accreditations running out. One email per listing per day. */
export async function emailTradeExpiries(
  b: { id: string; email: string; contactName: string; tradingName: string },
  items: ExpiryNotice[]
) {
  const expired = items.filter((i) => i.stage === 'expired');
  const subject = expired.length
    ? `Action needed: ${expired.map((i) => i.label).join(', ')} expired`
    : `Reminder: ${items.map((i) => i.label).join(', ')} due to expire`;
  const lines = items
    .map((i) =>
      i.stage === 'expired'
        ? `<li><strong>${esc(i.label)}</strong> expired on ${ukDate(i.expiry)}.${i.label.includes('liability') ? ' Your listing is hidden from search until you update it.' : ' It no longer shows on your listing.'}</li>`
        : `<li><strong>${esc(i.label)}</strong> expires on ${ukDate(i.expiry)} (${i.days === 0 ? 'today' : `in ${i.days} day${i.days === 1 ? '' : 's'}`}).</li>`
    )
    .join('');
  await send(
    b.email,
    subject,
    `<p>Hi ${esc(b.contactName)},</p>
<p>This is about your listing for <strong>${esc(b.tradingName)}</strong> on The Little Green Book.</p>
<ul>${lines}</ul>
<p>When you have renewed, log in, upload the new certificate and enter the new expiry date. We will check it and your listing carries on as normal.</p>
<p><a href="${siteUrl()}/login" style="display:inline-block;background:#111;color:#fff;padding:10px 18px;text-decoration:none;border-radius:4px">Update my listing</a></p>`,
    'expiry-reminder'
  );
}

/** Daily round-up for admins of everything that hit a reminder stage today. */
export async function emailAdminExpiries(rows: { id: string; tradingName: string; items: ExpiryNotice[] }[]) {
  if (!rows.length) return;
  const admins = (process.env.ADMIN_EMAILS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const expiredCount = rows.reduce((n, r) => n + r.items.filter((i) => i.stage === 'expired').length, 0);
  const body = rows
    .map(
      (r) => `<p><a href="${siteUrl()}/admin/${r.id}"><strong>${esc(r.tradingName)}</strong></a><br>${r.items
        .map((i) => `${esc(i.label)}: ${i.stage === 'expired' ? `<strong>expired ${ukDate(i.expiry)}</strong>` : `expires ${ukDate(i.expiry)} (${i.days} days)`}`)
        .join('<br>')}</p>`
    )
    .join('');
  await send(
    admins,
    `Expiry flags: ${rows.length} listing${rows.length === 1 ? '' : 's'}${expiredCount ? `, ${expiredCount} expired` : ''}`,
    `<p>These listings hit a reminder point today. The trades have been emailed too.</p>${body}
<p><a href="${siteUrl()}/admin?status=expiring">See everything due in the next 30 days</a></p>`,
    'admin-expiries'
  );
}

const adminList = () => (process.env.ADMIN_EMAILS ?? '').split(',').map((s) => s.trim()).filter(Boolean);

export type Enquiry = { name: string; business?: string | null; email: string; phone?: string | null; schemes: string[]; message?: string | null };

/** Accreditation help enquiry: one to admins, one confirmation to the customer. */
export async function emailAccreditationEnquiry(e: Enquiry) {
  await send(
    adminList(),
    `Accreditation help enquiry: ${e.business || e.name}`,
    `<p><strong>${esc(e.name)}</strong>${e.business ? ` from ${esc(e.business)}` : ''} wants help with accreditation applications.</p>
<p>Schemes: ${esc(e.schemes.join(', ') || 'not sure yet')}<br>
Email: <a href="mailto:${esc(e.email)}">${esc(e.email)}</a><br>
Phone: ${esc(e.phone || 'not given')}</p>
${e.message ? `<p>${esc(e.message).replace(/\n/g, '<br>')}</p>` : ''}`,
    'enquiry-admin'
  );
  await send(
    e.email,
    'We have your accreditation enquiry',
    `<p>Hello ${esc(e.name.split(' ')[0])},</p>
<p>Thanks for getting in touch about ${esc(e.schemes.join(', ') || 'your accreditation applications')}. We will be in touch within two working days to talk it through and give you a fixed price.</p>
<p>The Little Green Book</p>`,
    'enquiry-customer'
  );
}

/** A supplier asked to be listed. */
export async function emailAdminSupplierSubmission(name: string, website: string | null, email: string) {
  await send(
    adminList(),
    `New supplier to check: ${name}`,
    `<p><strong>${esc(name)}</strong> has asked to be listed on the supplier page.</p>
<p>${website ? `Website: <a href="${esc(website)}">${esc(website)}</a><br>` : ''}Submitted by: ${esc(email)}</p>
<p><a href="${siteUrl()}/admin/resources">Review it in admin</a></p>`,
    'supplier-admin'
  );
}

/** A trade posted on the help board. */
export async function emailAdminHelpRequest(business: string | null, email: string, title: string, details: string) {
  await send(
    adminList(),
    `New help board post: ${title}`,
    `<p><strong>${esc(business ?? email)}</strong> posted on the help board.</p>
<p><strong>${esc(title)}</strong><br>${esc(details).replace(/\n/g, '<br>')}</p>
<p><a href="${siteUrl()}/help-board">See the help board</a> or <a href="${siteUrl()}/admin/resources">remove it in admin</a> if it should not be there.</p>`,
    'help-admin'
  );
}

/** Membership changes: new subscriber, cancellation, failed payment. */
export async function emailAdminBilling(subject: string, line: string, businessId?: string) {
  await send(
    adminList(),
    subject,
    `<p>${esc(line)}</p>${businessId ? `<p><a href="${siteUrl()}/admin/${businessId}">Open the listing in admin</a></p>` : ''}`,
    'billing-admin'
  );
}

/** Tells a member their renewal payment failed. Stripe retries automatically. */
export async function emailMemberPaymentFailed(to: string, tradingName: string) {
  await send(
    to,
    'Your Little Green Book payment did not go through',
    `<p>We could not take the payment for your listing for ${esc(tradingName)}.</p>
<p>Your card provider may have declined it, or the card may have expired. We will try again over the next few days. To update your card, log in and press <strong>Manage billing</strong> on your listing.</p>
<p><a href="${siteUrl()}/login?next=/account">Log in to update your card</a></p>`,
    'billing-member'
  );
}

const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#b8562a;color:#fff;padding:10px 18px;text-decoration:none;border-radius:2px;font-weight:bold">${esc(label)}</a>`;

/** A member uploaded an insurance or accreditation certificate to their compliance pack. */
export async function emailAdminComplianceUpload(b: { id: string; tradingName: string }, title: string) {
  await send(
    adminList(),
    `Compliance pack certificate to check: ${b.tradingName}`,
    `<p><strong>${esc(b.tradingName)}</strong> has uploaded <strong>${esc(title)}</strong> to their compliance pack.</p>
<p>Contractors will not see it until it has been checked.</p>
<p><a href="${siteUrl()}/admin/${b.id}#pack">Check it in admin</a></p>`,
    'pack-admin'
  );
}

/** Tells a member we have checked, or not accepted, a certificate in their pack. */
export async function emailComplianceChecked(
  m: { email: string; contactName: string; tradingName: string; businessId: string },
  title: string,
  accepted: boolean,
  reason?: string,
) {
  await send(
    m.email,
    accepted ? `${title} has been checked` : `${title} needs another look`,
    accepted
      ? `<p>Hi ${esc(m.contactName)},</p>
<p>We have checked <strong>${esc(title)}</strong> in the compliance pack for ${esc(m.tradingName)}. It now shows as <strong>Checked by TLGB</strong> on every link you have shared.</p>
<p>${button(`${siteUrl()}/account/${m.businessId}/compliance`, 'Open my compliance pack')}</p>`
      : `<p>Hi ${esc(m.contactName)},</p>
<p>We could not accept <strong>${esc(title)}</strong> in the compliance pack for ${esc(m.tradingName)}.</p>
<p>Reason: ${esc(reason ?? '')}</p>
<p>Upload a corrected copy and we will check it again. If you had an earlier version in date, contractors still see that one.</p>
<p>${button(`${siteUrl()}/account/${m.businessId}/compliance`, 'Open my compliance pack')}</p>`,
    'pack-checked'
  );
}

export type PackReminder = { title: string; kind: 'exp30' | 'exp7' | 'expired' | 'review'; date: string; days: number; links: number };

/** Daily round-up to a member of pack documents that need attention. */
export async function emailPackReminders(
  m: { email: string; contactName: string; tradingName: string; businessId: string },
  items: PackReminder[],
) {
  const first = items[0];
  const subject = items.length === 1
    ? first.kind === 'expired' ? `Your ${first.title} has expired`
      : first.kind === 'review' ? `Time to review your ${first.title}`
      : `Your ${first.title} expires in ${first.days} day${first.days === 1 ? '' : 's'}`
    : `${items.length} documents in your compliance pack need attention`;
  const line = (i: PackReminder) =>
    i.kind === 'expired' ? `<li><strong>${esc(i.title)}</strong> expired on ${ukDate(i.date)}. Contractors see it in red.</li>`
    : i.kind === 'review' ? `<li><strong>${esc(i.title)}</strong> was last reviewed on ${ukDate(i.date)}. Read it through, update it if anything has changed, and upload it with today's date.</li>`
    : `<li><strong>${esc(i.title)}</strong> expires on ${ukDate(i.date)}${i.links ? ` (${i.links} active link${i.links === 1 ? ' includes' : 's include'} it)` : ''}.</li>`;
  await send(
    m.email,
    subject,
    `<p>Hi ${esc(m.contactName)},</p>
<p>This is about the compliance pack for <strong>${esc(m.tradingName)}</strong>.</p>
<ul>${items.map(line).join('')}</ul>
<p>Upload the new version and every link you have shared will update by itself.</p>
<p>${button(`${siteUrl()}/account/${m.businessId}/compliance`, 'Open my compliance pack')}</p>`,
    'pack-reminder'
  );
}

/** Once a year: time to update turnover and accident figures in the PQQ answer bank. */
export async function emailPqqFigures(m: { email: string; contactName: string; tradingName: string; businessId: string }) {
  await send(
    m.email,
    'Time to update your PQQ figures',
    `<p>Hi ${esc(m.contactName)},</p>
<p>It has been a year since you updated the turnover and accident figures in the PQQ answer bank for <strong>${esc(m.tradingName)}</strong>.</p>
<p>Most questionnaires ask for the last three years, so add your latest year now and every answer you copy or share stays up to date.</p>
<p>${button(`${siteUrl()}/account/${m.businessId}/pqq#sec-finance`, 'Update my figures')}</p>`,
    'pqq-reminder'
  );
}

// ---------------------------------------------------------------
// Main contractors
// ---------------------------------------------------------------
const para = (s: string) => esc(s).replace(/\n/g, '<br>');

export async function emailAdminNewContractor(c: { id: string; name: string; companyNumber: string | null; website: string | null; userName: string; email: string; domainNote: string }) {
  await send(
    adminList(),
    `Contractor to approve: ${c.name}`,
    `<p>A main contractor has asked to join.</p>
<p><strong>${esc(c.name)}</strong>${c.companyNumber ? ` (company ${esc(c.companyNumber)})` : ''}<br>
${esc(c.userName)} (${esc(c.email)})<br>
${c.website ? `Website: ${esc(c.website)}<br>` : ''}${esc(c.domainNote)}</p>
<p>${button(`${siteUrl()}/admin/contractors`, 'Review in admin')}</p>`,
    'admin-contractor'
  );
}

export async function emailContractorReceived(to: string, name: string, company: string) {
  await send(
    to,
    'We have your contractor account request',
    `<p>Hi ${esc(name)},</p>
<p>Thanks for registering <strong>${esc(company)}</strong> on The Little Green Book.</p>
<p>We check every contractor before they can post jobs, usually within one working day. In the meantime you can log in, search trades and start saving them to your shortlist.</p>
<p>${button(`${siteUrl()}/login?next=/contractor`, 'Log in')}</p>`,
    'contractor-received'
  );
}

export async function emailContractorDecision(to: string, name: string, company: string, approved: boolean, reason?: string | null) {
  await send(
    to,
    approved ? `${company} is approved on The Little Green Book` : `Your contractor account for ${company}`,
    approved
      ? `<p>Hi ${esc(name)},</p>
<p>Good news: <strong>${esc(company)}</strong> is approved. You can now post jobs, invite trades from your shortlist to price, and add colleagues to your account.</p>
<p>It is free to use.</p>
<p>${button(`${siteUrl()}/login?next=/contractor`, 'Go to my dashboard')}</p>`
      : `<p>Hi ${esc(name)},</p>
<p>We could not approve the contractor account for <strong>${esc(company)}</strong>.</p>
${reason ? `<p>Reason: ${para(reason)}</p>` : ''}
<p>If you think this is a mistake, reply to this email.</p>`,
    approved ? 'contractor-approved' : 'contractor-rejected'
  );
}

export async function emailContractorUserAdded(to: string, name: string, company: string, addedBy: string) {
  await send(
    to,
    `You have been added to ${company} on The Little Green Book`,
    `<p>Hi ${esc(name)},</p>
<p>${esc(addedBy)} has added you to the <strong>${esc(company)}</strong> account on The Little Green Book, where your team keeps its shortlist of landscaping and external works trades and posts work packages.</p>
<p>There is no password. Log in with this email address and we will send you a link.</p>
<p>${button(`${siteUrl()}/login?next=/contractor`, 'Log in')}</p>`,
    'contractor-user-added'
  );
}

export type JobAlert = { id: string; title: string; company: string; town: string | null; postcode: string; trades: string; value: string | null; returnDate: string | null; startDate: string | null };

/** To a matching member, or a trade the contractor invited. */
export async function emailJobAlert(to: string, contactName: string, tradingName: string, j: JobAlert, invited: boolean) {
  const where = j.town ? `${j.town} (${j.postcode.split(' ')[0]})` : j.postcode.split(' ')[0];
  await send(
    to,
    invited ? `${j.company} has invited you to price: ${j.title}` : `New job from ${j.company}: ${j.title}`,
    `<p>Hi ${esc(contactName)},</p>
<p>${invited
      ? `<strong>${esc(j.company)}</strong> has invited <strong>${esc(tradingName)}</strong> to price a job.`
      : `<strong>${esc(j.company)}</strong> has posted a job that matches <strong>${esc(tradingName)}</strong>: your trade, your area and their requirements.`}</p>
<p><strong>${esc(j.title)}</strong><br>
${esc(j.trades)}<br>
Location: ${esc(where)}<br>
${j.value ? `Value: ${esc(j.value)}<br>` : ''}${j.startDate ? `Start: ${esc(ukDate(j.startDate))}<br>` : ''}${j.returnDate ? `Reply by: ${esc(ukDate(j.returnDate))}` : ''}</p>
<p>${button(`${siteUrl()}/jobs/${j.id}`, 'See the job and reply')}</p>
<p style="color:#777;font-size:13px">You get these because your listing matches jobs posted by main contractors. Turn job emails off from your listing page.</p>`,
    invited ? 'job-invite' : 'job-alert'
  );
}

export async function emailAdminNewJob(j: { id: string; title: string; company: string; matched: number }) {
  await send(
    adminList(),
    `Job posted: ${j.title}`,
    `<p><strong>${esc(j.company)}</strong> posted a job and it was sent to ${j.matched} matching member${j.matched === 1 ? '' : 's'}.</p>
<p><strong>${esc(j.title)}</strong></p>
<p>${button(`${siteUrl()}/admin/contractors`, 'Open contractor admin')}</p>`,
    'admin-job'
  );
}

export async function emailContractorNewReply(to: string[], j: { id: string; title: string }, tradingName: string, message: string | null) {
  await send(
    to,
    `${tradingName} replied to ${j.title}`,
    `<p><strong>${esc(tradingName)}</strong> is interested in <strong>${esc(j.title)}</strong>.</p>
${message ? `<p>${para(message)}</p>` : ''}
<p>${button(`${siteUrl()}/contractor/jobs/${j.id}`, 'See replies')}</p>`,
    'job-reply'
  );
}

export async function emailAdminJobReport(j: { id: string; title: string }, by: string, reason: string) {
  await send(
    adminList(),
    `Job reported: ${j.title}`,
    `<p>${esc(by)} reported a job.</p><p><strong>${esc(j.title)}</strong></p><p>${para(reason || 'No reason given')}</p>
<p>${button(`${siteUrl()}/admin/contractors`, 'Open contractor admin')}</p>`,
    'admin-job-report'
  );
}

// ---------------------------------------------------------------
// Payment tracker
// ---------------------------------------------------------------
export type PayAlert = { job: string; contractor: string; line: string; jobId: string };

/** One email a day at most, listing every payment deadline that needs attention. */
export async function emailPaymentAlerts(m: { email: string; contactName: string; tradingName: string; businessId: string }, items: PayAlert[]) {
  const list = items.map((i) => `<li><strong>${esc(i.job)}</strong> (${esc(i.contractor)}): ${esc(i.line)} <a href="${siteUrl()}/account/${m.businessId}/payments/${i.jobId}">Open</a></li>`).join('');
  await send(
    m.email,
    items.length === 1 ? `Payment alert: ${items[0].job}` : `${items.length} payment alerts for ${m.tradingName}`,
    `<p>Hi ${esc(m.contactName)},</p>
<p>Your payment tracker has spotted ${items.length === 1 ? 'something' : 'some things'} that need${items.length === 1 ? 's' : ''} attention:</p>
<ul>${list}</ul>
<p>Each job page has the right notice ready to download, filled in with the dates and amounts.</p>
<p>${button(`${siteUrl()}/account/${m.businessId}/payments`, 'Open my payment tracker')}</p>`,
    'payment-alert'
  );
}
