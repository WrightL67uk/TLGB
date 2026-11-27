import 'server-only';
import type { NextRequest } from 'next/server';
import { db } from '@/lib/supabase';
import { cleanCode, CODE_COOKIE } from '@/lib/discounts';

// Partner programme: partners share a link (/p/CODE). A visit is remembered for 90 days, the business
// that signs up is tied to the partner, and each paid invoice from that business earns a commission.

export const PARTNER_COOKIE = 'tlgb_partner';
export const PARTNER_DAYS = 90;

export type Partner = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  kind: string | null;
  code: string;
  dashboard_token: string;
  status: 'approved' | 'suspended';
  monthly_pence: number;
  yearly_pence: number;
  note: string | null;
};

export type Commission = {
  id: string;
  created_at: string;
  partner_id: string;
  business_id: string | null;
  business_name: string | null;
  stripe_invoice_id: string;
  amount_pence: number;
  status: 'earned' | 'paid' | 'reversed';
  paid_at: string | null;
  note: string | null;
};

export const PARTNER_KINDS = [
  'Supplier or nursery',
  'Recruitment agency',
  'Compliance or H&S consultant',
  'Accountant or broker',
  'Trade press or newsletter',
  'Creator or coach',
  'Group admin',
  'Sales agent',
  'Member',
  'Other',
];

export const pounds = (pence: number) => `£${(pence / 100).toFixed(2).replace(/\.00$/, '')}`;

export async function findPartnerByCode(raw: unknown, opts: { approvedOnly?: boolean } = {}) {
  const code = cleanCode(raw);
  if (code.length < 3) return null;
  const { data } = await db().from('partners').select('*').eq('code', code).maybeSingle();
  if (!data) return null;
  if (opts.approvedOnly && data.status !== 'approved') return null;
  return data as Partner;
}

/**
 * The partner who should get credit for a sign-up: the partner link they followed, otherwise a code they typed
 * (the sign-up page remembers typed codes in the discount code cookie).
 */
export async function partnerForSignup(req: NextRequest) {
  const viaLink = await findPartnerByCode(req.cookies.get(PARTNER_COOKIE)?.value, { approvedOnly: true }).catch(() => null);
  if (viaLink) return viaLink;
  return findPartnerByCode(req.cookies.get(CODE_COOKIE)?.value, { approvedOnly: true }).catch(() => null);
}

/**
 * Called when Stripe says an invoice is paid. Credits the partner who introduced this business, once per invoice.
 * Free trial invoices and invoices fully covered by a discount are for nothing, so they earn nothing.
 */
export async function recordCommission(invoice: Record<string, any>, businessId: string, interval: 'month' | 'year') { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!(Number(invoice.amount_paid) > 0)) return null;
  const { data: biz } = await db().from('businesses').select('id, trading_name, partner_id').eq('id', businessId).maybeSingle();
  if (!biz?.partner_id) return null;
  const { data: partner } = await db().from('partners').select('*').eq('id', biz.partner_id).maybeSingle();
  if (!partner || partner.status !== 'approved') return null;
  const amount = interval === 'year' ? partner.yearly_pence : partner.monthly_pence;
  if (!(amount > 0)) return null;
  // The unique invoice id makes this safe to run twice: the second insert is simply refused.
  const { error } = await db().from('partner_commissions').insert({
    partner_id: partner.id,
    business_id: biz.id,
    business_name: biz.trading_name,
    stripe_invoice_id: String(invoice.id),
    amount_pence: amount,
  });
  if (error && error.code !== '23505') throw error;
  return error ? null : { partner: partner as Partner, amount };
}

/** A refunded or disputed invoice takes its commission back, as long as it has not been paid out yet. */
export async function reverseCommission(invoiceId: string, why: string) {
  await db().from('partner_commissions').update({ status: 'reversed', note: why })
    .eq('stripe_invoice_id', invoiceId).eq('status', 'earned');
  // Already paid out: leave it, but leave a note so it shows in admin
  await db().from('partner_commissions').update({ note: `${why} (already paid out, take it off the next payout)` })
    .eq('stripe_invoice_id', invoiceId).eq('status', 'paid');
}

/** Unique, readable partner code from a name, avoiding discount codes and other partners. */
export async function freshPartnerCode(name: string, wanted?: string) {
  const base = cleanCode(wanted || name).slice(0, 14) || 'PARTNER';
  for (let i = 0; i < 20; i++) {
    const code = i === 0 ? base : `${base}${Math.floor(10 + Math.random() * 90)}`;
    if (code.length < 3) continue;
    const [{ data: p }, { data: d }] = await Promise.all([
      db().from('partners').select('id').eq('code', code).maybeSingle(),
      db().from('discount_codes').select('id').eq('code', code).maybeSingle(),
    ]);
    if (!p && !d) return code;
    if (wanted && i === 0) return null; // a code asked for by name must be free as typed
  }
  return null;
}
