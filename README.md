# TLGB: The Little Green Book (Phase 1)

Directory of vetted landscape and external works trades. Contractors search by job postcode, trade, minimum public liability cover and accreditations. Every listing is approved by hand before it goes live.

## How the sign-up works

1. **Ltd or sole trader?** First question on the form.
   - **Limited company:** enters company number, clicks Check, and we pull the name, status and registered address from Companies House. Only *active* companies can apply. The check runs again on the server so it can't be faked.
   - **Sole trader:** no Companies House record, so they give their full name and business address and upload a copy of their **letterhead** (PDF, JPG or PNG).
2. Everyone picks an **annual turnover band**, which sets their listing price (bands and placeholder prices live in `lib/config.ts`, so they are a one-line change once agreed). They then give contact details, trades (15 categories, from landscapers and architects to nurseries, suppliers, trainers and gritters), base postcode and travel radius, public liability cover, expiry and certificate (required), optional employers liability, accreditations and up to 6 photos.
3. Files upload straight from the browser to Supabase Storage (avoids Vercel's 4.5MB request limit). The application is held as a `draft` until every file has arrived, then moves to `pending_review`.
4. **SendGrid emails:**
   - Admin gets "Approval needed: {business}" with a Review button (every address in `ADMIN_EMAILS`).
   - Applicant gets "We have your application".
5. **Admin** at `/admin` (username and password prompt) sees the queue, opens an application, views documents (private, 10 minute links), sees the Companies House result or a sole trader checklist, then:
   - **Approve** (optionally as a free founding member) and the applicant is emailed, or
   - **Reject** with a reason, which is emailed to the applicant, or
   - **Suspend** an approved listing later.
   Every decision is logged in the History panel.
6. Approved listings appear in search if they are a founding member or have an active subscription, and their public liability hasn't expired.

## Trade logins ("My listing")

Trades log in at `/login` with no password: they enter their email and get a one-time link (valid 30 minutes). The link opens a page with a **Continue** button rather than logging straight in, because company email filters (Microsoft Defender, Mimecast) open links to scan them and would otherwise use the link up. Sessions last 30 days.

On **My listing** a trade can edit their details, trades, coverage area, turnover band, insurance and accreditations, upload new certificates, and add or remove photos (up to 6).

What happens when they save:

| Listing status | Change | Result |
|---|---|---|
| Approved | Description, contact details, postcode, radius, photos | Live straight away |
| Approved | Trading name, trades, accreditations, insurance, turnover band, address, any new document | Stays live, appears under **Changes to check** in admin, admin emailed once |
| Rejected | Anything | Goes back to **Awaiting approval**, admin emailed |
| Suspended | Nothing | Read only |

Insurance cover or expiry can only be changed after a new public liability certificate has been uploaded (within the last 3 hours), and an expired date is refused.

Admin extras on each listing page: **Mark as checked** for flagged changes, and **Create login link**, which makes a one-time link valid for 24 hours. Use it for support, or to demo logins before SendGrid is set up (without SendGrid, login emails are skipped).

Login emails come from your domain via SendGrid, so finish the email setup below before launch.

## Setup

1. **Supabase:** create a project, open SQL Editor, run `supabase/schema.sql` (if you already ran an older copy, run only the newer files in `supabase/migrations/` instead, in number order). This creates the tables, search function and the `documents` (private) and `portfolio` (public) storage buckets.
2. **Companies House:** register at developer.company-information.service.gov.uk, create an application, and make a REST API key (free).
3. **Domain and SendGrid:** buy the domain, set up a mailbox on it, authenticate it in SendGrid and add the DNS records. Follow **Keeping emails out of spam** below step by step. Do this early: a brand new domain needs a few weeks of history before inboxes fully trust it.
4. Copy `.env.example` to `.env.local` and fill it in.
5. `npm install` then `npm run dev` and open http://localhost:3000
6. **Deploy:** push to GitHub, import into Vercel, and add the same environment variables. Set `SITE_URL` to the live address so email links work.

## Keeping emails out of spam

Every approval, rejection and "approval needed" email depends on this, so treat it as part of the build, not an afterthought. Most contractors use Microsoft 365, often with an extra filter like Mimecast in front, and these are strict.

### 1. Domain and mailbox

1. **Send from your own domain**, e.g. `hello@tlgb.co.uk`. Never from a Gmail, Hotmail or BT address: those fail authentication when sent through SendGrid and go straight to junk.
2. **Register the domain now**, even before the site is ready. Filters are suspicious of domains only days old.
3. **Pick a DNS host you can edit easily** (Cloudflare is free and simple; most registrars also work). You will be adding several records.
4. **Set up a real mailbox** on the domain (Google Workspace or Microsoft 365) for `hello@`. Replies to TLGB emails land there, and filters like a From address that can actually receive mail. Put it in `EMAIL_FROM` and `EMAIL_REPLY_TO`.
5. **Keep marketing separate.** Use a newsletter tool (Mailchimp, MailerLite and similar) for promotions like "free month at the trade show", and keep SendGrid for system emails only. If a marketing email gets spam complaints, it then can't drag your approval emails into junk.

### 2. SendGrid account

1. **Turn on two-factor login** and create an API key with **Mail Send** permission only. Leaked keys get used to send spam and SendGrid suspends the account.
2. **Settings > Sender Authentication > Authenticate Your Domain.** Choose your DNS host, leave *automated security* on, and enter `tlgb.co.uk`. SendGrid gives you **3 CNAME records**. Add them at your DNS host exactly as shown, then press Verify. Can take from minutes to 48 hours.
3. On the same screen, set up **Link Branding** (2 more CNAMEs). Any links then show your domain instead of SendGrid's.
4. Skip "Single Sender Verification" except for quick testing. Domain authentication replaces it.
5. **Settings > Tracking:** switch off Click Tracking and Open Tracking. The code already turns them off per email; this is belt and braces.

### 3. DNS records to check

| Record | Where | Value |
|---|---|---|
| SendGrid CNAMEs (3) | as given by SendGrid | Signs every email (DKIM) and handles bounces |
| Link branding CNAMEs (2) | as given by SendGrid | Branded links |
| MX | `tlgb.co.uk` | From your mailbox provider |
| SPF (TXT) | `tlgb.co.uk` | For your mailbox provider, e.g. `v=spf1 include:_spf.google.com ~all` (Google) or `v=spf1 include:spf.protection.outlook.com ~all` (Microsoft) |
| DMARC (TXT) | `_dmarc.tlgb.co.uk` | Start with `v=DMARC1; p=none; rua=mailto:hello@tlgb.co.uk` |

Notes:
- **Only one SPF record is allowed.** Never add a second one. With automated security on, SendGrid's SPF is covered by its CNAMEs, so you don't need to add SendGrid to the root SPF.
- **DMARC:** start with `p=none` so nothing is blocked while you check reports. After 2 to 4 weeks of passing results, change to `p=quarantine`. Gmail, Yahoo and Microsoft all expect DMARC from bulk senders, and it helps even at small volumes.

### 4. What the code already does

- Every email has a proper HTML version **and** a plain-text version.
- Click and open tracking are off, so no rewritten links or tracking pixels.
- Real Reply-To address and a consistent From name ("The Little Green Book").
- Footer says who sent it and why. Fill in `BUSINESS_POSTAL_ADDRESS` so it shows a real address.
- Admin alerts go one per admin, never as a group email.
- No attachments, no link shorteners, short plain subject lines.

If you edit the wording later: avoid ALL CAPS, piles of exclamation marks, "FREE", lots of images, and link shorteners like bit.ly.

### 5. Test before launch

1. Go to **mail-tester.com**, copy the address it gives you, and trigger a real email to it (apply with that address). Aim for 9/10 or better. It lists exactly what to fix.
2. Send test applications to a **Gmail** address, an **Outlook.com** address, and a **company Microsoft 365** address (yours at Wrights is ideal). Check each landed in the inbox.
3. In Gmail, open the email, menu > **Show original**. SPF, DKIM and DMARC should all say **PASS**.
4. Sign up to **Google Postmaster Tools** with the domain to watch your reputation with Gmail once volume builds.

### 6. Once live

- Ask founding members to add `hello@tlgb.co.uk` to their contacts. The thank-you page already prompts this.
- Check SendGrid **Activity** and **Stats** weekly. Keep bounces under 2% and spam reports close to zero (Gmail starts filtering above 0.3%).
- If a contractor says emails go to junk, ask them to mark one "Not junk", or for their IT to allow `tlgb.co.uk` in Mimecast or Microsoft Defender.
- Stay on SendGrid's shared IP. A dedicated IP only helps at much higher volumes and needs warming up.

## Files

| Path | What it does |
|---|---|
| `supabase/schema.sql` | Database, search function, storage buckets |
| `app/join/JoinForm.tsx` | Sign-up form with Ltd / sole trader branching |
| `app/api/companies-house` | Live company number lookup for the form |
| `app/api/apply` | Validates, saves draft, returns signed upload links |
| `app/login`, `app/api/auth` | Email link login, scanner-safe confirm page, logout |
| `app/account` | My listing pages and editor |
| `app/api/account` | Save listing, upload files, remove photos |
| `lib/session.ts` | Login links and sessions (only hashes stored) |
| `lib/account.ts` | Ownership checks and the "changes to check" flag |
| `app/api/apply/complete` | Confirms uploads, queues for review, sends emails |
| `app/admin` | Approval queue and review page |
| `app/api/admin/decision` | Approve, reject, suspend |
| `app/page.tsx` | Public search |
| `app/b/[id]` | Public business profile |
| `lib/email.ts` | SendGrid email templates |
| `middleware.ts` | Password protects `/admin` |

## Not in Phase 1 yet

- Stripe subscriptions (`subscription_status` column is ready; founding members are free until then)
- Automatic reading of insurance certificates and expiry reminders (Phase 2)
- Tender board (Phase 3)
- Clean-up job for abandoned `draft` applications (delete drafts older than a day)
- Proper admin logins once there is more than one admin (admin is still a single username and password)
