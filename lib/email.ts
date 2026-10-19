import 'server-only';
import sgMail from '@sendgrid/mail';
import { env, siteUrl } from './config';

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
You are receiving this because of an application made on ${esc(siteUrl().replace(/^https?:\/\//, ''))}.
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
  if (!process.env.SENDGRID_API_KEY || !process.env.EMAIL_FROM) {
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
        from: { email: env('EMAIL_FROM'), name: 'The Little Green Book' },
        replyTo: process.env.EMAIL_REPLY_TO || env('EMAIL_FROM'),
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

export async function emailApplicantApproved(to: string, name: string, tradingName: string) {
  await send(
    to,
    `${tradingName} is approved`,
    `<p>Hi ${esc(name)},</p>
<p>Good news. <strong>${esc(tradingName)}</strong> has been approved and is now listed on The Little Green Book.</p>
<p>Contractors searching your area can now find you. Keep your insurance documents up to date so your listing stays live.</p>
<p>You can update your details, photos and certificates at any time. Log in with this email address at
<a href="${siteUrl()}/login">${esc(siteUrl().replace(/^https?:\/\//, ''))}/login</a>.</p>`,
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
