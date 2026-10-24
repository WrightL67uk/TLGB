import 'server-only';
import { db } from './supabase';
import { unverifiedReason, type Pending } from './membership';
import { expiryItems, daysUntil, fmtDate, type Expiries } from './expiries';
import { awaitingCheck } from './expiryJob';
import { entitlements } from './contractorPlans';
import { emailShortlistAlerts, type ShortlistChange } from './email';

// How many days ahead a contractor is warned that a saved trade's paperwork is about to run out.
const SOON_DAYS = 14;

type Watch = { company_id: string; business_id: string; item: string; expiry: string | null; state: string };
type Now = { item: string; label: string; expiry: string | null; state: string; pending: boolean };

const expiryState = (d: string) => { const n = daysUntil(d); return n < 0 ? 'expired' : n <= SOON_DAYS ? 'soon' : 'ok'; };

/** What we would tell a contractor about one change, or null if it is not worth an email. */
function describe(prev: Watch, cur: Now): Omit<ShortlistChange, 'businessId' | 'tradingName'> | null {
  if (cur.item === 'listing') {
    if (prev.state === cur.state) return null;
    if (cur.state === 'unlisted') return { tone: 'bad', line: 'No longer listed on The Little Green Book.' };
    if (cur.state === 'membership') return { tone: 'bad', line: 'Membership has lapsed, so we are no longer checking their documents.' };
    return { tone: 'good', line: 'Verified member again.' };
  }
  const later = !!(cur.expiry && prev.expiry && cur.expiry > prev.expiry);
  if (later && prev.state !== 'ok' && cur.state !== 'expired') return { tone: 'good', line: `${cur.label} renewed, in date until ${fmtDate(cur.expiry!)}.` };
  if (cur.state === 'expired' && prev.state !== 'expired') {
    return { tone: 'bad', line: `${cur.label} expired on ${fmtDate(cur.expiry!)}.${cur.pending ? ' They have sent us a renewal, which we are checking.' : ''}` };
  }
  if (cur.state === 'soon' && prev.state === 'ok') {
    const n = daysUntil(cur.expiry!);
    return { tone: 'warn', line: `${cur.label} expires on ${fmtDate(cur.expiry!)} (${n === 0 ? 'today' : `in ${n} day${n === 1 ? '' : 's'}`}).${cur.pending ? ' A renewal is with us for checking.' : ''}` };
  }
  return null;
}

/**
 * Daily: compares each saved trade's insurance, accreditations and membership with what the
 * contractor was last told, emails a digest of anything that has started to run out, lapsed
 * or been renewed, and records the new state. A trade added to a shortlist is recorded
 * silently first, since the shortlist page already shows its current status.
 */
export async function runShortlistAlerts() {
  const { data: favs } = await db().from('contractor_favourites').select('company_id, business_id').limit(50000);
  if (!favs?.length) return 0;
  const bids = [...new Set(favs.map((f) => f.business_id as string))];
  const cids = [...new Set(favs.map((f) => f.company_id as string))];

  const [{ data: businesses }, { data: companies }, { data: users }, { data: watchRows }] = await Promise.all([
    db().from('businesses').select('id, trading_name, status, founding_member, subscription_status, pl_expiry, el_expiry, el_cover_amount, accreditations, accreditation_expiries, pending_dates').in('id', bids),
    db().from('contractor_companies').select('id, name, status, plan, plan_overrides').in('id', cids),
    db().from('contractor_users').select('company_id, email, shortlist_alerts').in('company_id', cids).is('removed_at', null),
    db().from('shortlist_watch').select('company_id, business_id, item, expiry, state').in('company_id', cids).limit(200000),
  ]);
  const biz = new Map((businesses ?? []).map((b) => [b.id as string, b]));
  const watch = new Map((watchRows ?? []).map((w) => [`${w.company_id}|${w.business_id}|${w.item}`, w as Watch]));

  // Current state of every saved trade, worked out once
  const nowOf = new Map<string, Now[]>();
  for (const [id, b] of biz) {
    const pending = b.pending_dates as Pending | null;
    const items: Now[] = expiryItems({ ...b, accreditation_expiries: b.accreditation_expiries as Expiries })
      .map((i) => ({ item: i.key, label: i.label, expiry: i.expiry, state: expiryState(i.expiry), pending: awaitingCheck(pending, i.key) }));
    const listing = b.status !== 'approved' ? 'unlisted' : unverifiedReason(b) === 'membership' ? 'membership' : 'ok';
    items.push({ item: 'listing', label: 'Listing', expiry: null, state: listing, pending: false });
    nowOf.set(id, items);
  }

  const upserts: Watch[] = [];
  const removals: { company_id: string; business_id: string; item: string }[] = [];
  const perCompany = new Map<string, ShortlistChange[]>();

  for (const f of favs) {
    const cid = f.company_id as string; const bid = f.business_id as string;
    const b = biz.get(bid); const cur = nowOf.get(bid);
    if (!b || !cur) continue;
    for (const c of cur) {
      const key = `${cid}|${bid}|${c.item}`;
      const prev = watch.get(key);
      watch.delete(key);
      if (prev && prev.state === c.state && prev.expiry === c.expiry) continue;
      upserts.push({ company_id: cid, business_id: bid, item: c.item, expiry: c.expiry, state: c.state });
      if (!prev) continue;
      const d = describe(prev, c);
      if (d) {
        const list = perCompany.get(cid) ?? [];
        list.push({ ...d, businessId: bid, tradingName: b.trading_name as string });
        perCompany.set(cid, list);
      }
    }
  }
  // Anything left was removed from a listing, or the trade was taken off the shortlist
  for (const w of watch.values()) removals.push({ company_id: w.company_id, business_id: w.business_id, item: w.item });

  const now = new Date().toISOString();
  for (let i = 0; i < upserts.length; i += 500) {
    await db().from('shortlist_watch').upsert(upserts.slice(i, i + 500).map((u) => ({ ...u, updated_at: now })), { onConflict: 'company_id,business_id,item' });
  }
  for (const r of removals) {
    await db().from('shortlist_watch').delete().eq('company_id', r.company_id).eq('business_id', r.business_id).eq('item', r.item);
  }

  let sent = 0;
  for (const [cid, changes] of perCompany) {
    const co = (companies ?? []).find((c) => c.id === cid);
    if (!co || co.status !== 'approved' || !entitlements(co).complianceAlerts) continue;
    const to = (users ?? []).filter((u) => u.company_id === cid && u.shortlist_alerts !== false).map((u) => u.email as string);
    if (!to.length) continue;
    await emailShortlistAlerts(to, co.name as string, changes);
    sent++;
  }
  return sent;
}
