import 'server-only';
import { createHash, createHmac, randomUUID } from 'crypto';
import { db } from './supabase';
import { env, siteUrl } from './config';
import { miles } from './resources';

export const MATCH_MILES = 80;      // local suppliers within this distance of the delivery postcode
export const MAX_SUPPLIERS = 6;     // most suppliers one request can go to
export const DEFAULT_PICK = 4;      // how many are ticked to start with
export const INVITE_LINK_DAYS = 60; // supplier links keep working this long after the request closes

export const hashToken = (s: string) => createHash('sha256').update(s).digest('hex');
export const newInviteId = () => randomUUID();

/**
 * Each supplier's private link. Worked out from the invite id with a secret, so we can
 * put the same link in reminders without storing it; only its hash is saved.
 */
export const inviteToken = (inviteId: string) =>
  createHmac('sha256', env('SUPABASE_SERVICE_ROLE_KEY')).update(`quote-invite:${inviteId}`).digest('base64url').slice(0, 32);
export const inviteLink = (inviteId: string) => `${siteUrl()}/quote/${inviteToken(inviteId)}`;

export type QuoteSupplier = {
  id: string; name: string; categories: string[]; town: string | null; email: string | null;
  lat: number | null; lng: number | null; delivers_nationally: boolean;
  quote_requests: boolean; quote_plan: string | null; quote_paid_until: string | null;
};

/** A supplier gets estimate requests while switched on and either founding or paid up. */
export function takesRequests(s: Pick<QuoteSupplier, 'quote_requests' | 'quote_plan' | 'quote_paid_until' | 'email'>) {
  if (!s.quote_requests || !s.email) return false;
  if (s.quote_plan === 'founding') return true;
  const today = new Date().toISOString().slice(0, 10);
  return s.quote_plan === 'paid' && !!s.quote_paid_until && s.quote_paid_until >= today;
}

export type Rating = { avg: number; count: number };

export async function ratingsFor(ids: string[]): Promise<Record<string, Rating>> {
  if (!ids.length) return {};
  const { data } = await db().from('supplier_ratings').select('supplier_id, stars').in('supplier_id', ids).eq('hidden', false);
  const out: Record<string, Rating> = {};
  for (const r of data ?? []) {
    const o = (out[r.supplier_id] ??= { avg: 0, count: 0 });
    o.avg = (o.avg * o.count + r.stars) / (o.count + 1);
    o.count++;
  }
  return out;
}

export type Match = { id: string; name: string; town: string | null; dist: number | null; national: boolean; covers: string[]; rating: Rating | null };

/** Suppliers that sell at least one of these categories and deliver to this point, nearest first. */
export async function matchSuppliers(categories: string[], lat: number, lng: number): Promise<Match[]> {
  if (!categories.length) return [];
  const { data } = await db()
    .from('suppliers')
    .select('id, name, categories, town, email, lat, lng, delivers_nationally, quote_requests, quote_plan, quote_paid_until')
    .eq('status', 'approved')
    .eq('quote_requests', true)
    .overlaps('categories', categories);
  const rows = ((data ?? []) as QuoteSupplier[])
    .filter(takesRequests)
    .map((s) => ({ s, dist: s.lat != null && s.lng != null ? miles(lat, lng, s.lat, s.lng) : null }))
    .filter(({ s, dist }) => s.delivers_nationally || (dist != null && dist <= MATCH_MILES))
    .sort((a, b) => {
      // more of the list covered first, then nearest
      const ca = categories.filter((c) => a.s.categories.includes(c)).length;
      const cb = categories.filter((c) => b.s.categories.includes(c)).length;
      return cb - ca || (a.dist ?? 9999) - (b.dist ?? 9999);
    });
  const ratings = await ratingsFor(rows.map((r) => r.s.id));
  return rows.map(({ s, dist }) => ({
    id: s.id, name: s.name, town: s.town, dist, national: s.delivers_nationally,
    covers: categories.filter((c) => s.categories.includes(c)), rating: ratings[s.id] ?? null,
  }));
}

export type QLine = { id: string; position: number; category: string; item: string; spec: string | null; root: string | null; qty: number; unit: string; notes: string | null; listed: boolean };
export type QPrice = { invite_id: string; line_id: string; available: 'yes' | 'no' | 'sub'; unit_price: number | null; substitute: string | null; note: string | null };
export type QInvite = {
  id: string; request_id: string; supplier_id: string; status: string; viewed_at: string | null; quoted_at: string | null;
  goods_total: number | null; delivery_charge: number | null; lead_days: number | null; valid_until: string | null;
  notes: string | null; decline_reason: string | null;
};
export type QRequest = {
  id: string; created_at: string; business_id: string; email: string; reference: string; postcode: string; area: string | null;
  needed_by: string | null; delivery_notes: string | null; closes_at: string; status: string; accepted_invite: string | null;
};

export const num = (v: unknown) => (v == null ? null : Number(v));
export const cleanLine = (l: Record<string, unknown>) => ({ ...l, qty: Number(l.qty) }) as QLine;
export const cleanPrice = (p: Record<string, unknown>) => ({ ...p, unit_price: num(p.unit_price) }) as QPrice;
export const cleanInvite = (i: Record<string, unknown>) =>
  ({ ...i, goods_total: num(i.goods_total), delivery_charge: num(i.delivery_charge), lead_days: num(i.lead_days) }) as QInvite;

/** Goods total for one supplier: only lines they can supply (as asked or as a substitute). */
export function goodsTotal(lines: QLine[], prices: QPrice[]) {
  let total = 0; let missing = 0; let subs = 0;
  for (const l of lines) {
    const p = prices.find((x) => x.line_id === l.id);
    if (!p || p.available === 'no' || p.unit_price == null) { missing++; continue; }
    if (p.available === 'sub') subs++;
    total += p.unit_price * l.qty;
  }
  return { total: Math.round(total * 100) / 100, missing, subs };
}

export const isOpen = (r: Pick<QRequest, 'status' | 'closes_at'>) => r.status === 'open' && new Date(r.closes_at) > new Date();

export async function loadInviteByToken(token: string) {
  if (!token || token.length > 100) return null;
  const { data: inv } = await db().from('quote_invites').select('*').eq('token_hash', hashToken(token)).maybeSingle();
  if (!inv) return null;
  const { data: req } = await db().from('quote_requests').select('*').eq('id', inv.request_id).maybeSingle();
  if (!req) return null;
  const limit = new Date(req.closes_at).getTime() + INVITE_LINK_DAYS * 86_400_000;
  if (Date.now() > limit || req.status === 'cancelled') return { expired: true as const, request: req as QRequest };
  const [{ data: lines }, { data: prices }, { data: sup }] = await Promise.all([
    db().from('quote_lines').select('*').eq('request_id', req.id).order('position'),
    db().from('quote_prices').select('*').eq('invite_id', inv.id),
    db().from('suppliers').select('id, name, email').eq('id', inv.supplier_id).maybeSingle(),
  ]);
  return {
    expired: false as const,
    invite: cleanInvite(inv), request: req as QRequest,
    lines: (lines ?? []).map(cleanLine), prices: (prices ?? []).map(cleanPrice),
    supplier: sup as { id: string; name: string; email: string | null },
  };
}

export const gbp = (n: number | null | undefined) =>
  n == null ? '' : n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 });

export const qtyText = (n: number) => (Number.isInteger(n) ? String(n) : n.toLocaleString('en-GB', { maximumFractionDigits: 2 }));

/** Short status for lists and badges. */
export function statusText(r: Pick<QRequest, 'status' | 'closes_at'>) {
  if (r.status === 'accepted') return { cls: 'accepted', label: 'Accepted' };
  if (r.status === 'cancelled') return { cls: 'cancelled', label: 'Closed' };
  if (isOpen(r)) return { cls: 'open', label: 'Waiting for prices' };
  return { cls: '', label: 'Ready to compare' };
}

