import Link from 'next/link';
import { getMembership } from '@/lib/membership';
import '../resources.css';
import { db } from '@/lib/supabase';
import { lookupPostcode } from '@/lib/postcodes';
import { SUPPLIER_CATEGORIES, supplierCategoryLabel, miles, shortUrl } from '@/lib/resources';
import { takesRequests, ratingsFor } from '@/lib/quotes';
import { isLive, hasProfile } from '@/lib/supplierAccount';
import { searchAudience } from '@/lib/homeUsers';
import './supplier.css';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Suppliers | The Little Green Book',
  description: 'Landscaping suppliers: topsoil, turf, trees and hedging, fencing, paving, tree pits, artificial grass and more. Free to search.',
};

type Supplier = {
  id: string; name: string; categories: string[]; description: string | null; website: string | null; phone: string | null;
  town: string | null; postcode: string | null; lat: number | null; lng: number | null; delivers_nationally: boolean;
  email: string | null; quote_requests: boolean; quote_plan: string | null; quote_paid_until: string | null;
  status?: 'approved'; tier?: 'appear' | 'match' | null; subscription_status?: string; slug?: string | null; public_email?: string | null;
};
type SP = Promise<{ q?: string; category?: string; postcode?: string }>;

export default async function SuppliersPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const audience = await searchAudience();
  const me = await getMembership();
  const q = (sp.q ?? '').trim().slice(0, 80);
  const category = SUPPLIER_CATEGORIES.some((c) => c.key === sp.category) ? sp.category! : '';
  const pcIn = (sp.postcode ?? '').trim().slice(0, 10);
  const where = pcIn ? await lookupPostcode(pcIn) : null;

  let query = db()
    .from('suppliers')
    .select('id, name, categories, description, website, phone, town, postcode, lat, lng, delivers_nationally, does_domestic, email, quote_requests, quote_plan, quote_paid_until, status, tier, subscription_status, slug, public_email')
    .eq('status', 'approved')
    .order('name')
    .limit(500);
  if (audience === 'home') query = query.eq('does_domestic', true);
  if (category) query = query.contains('categories', [category]);
  if (q) {
    const term = q.replace(/[%_,()]/g, ' ');
    query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%,town.ilike.%${term}%`);
  }
  let { data, error } = await query;
  if (error) {
    // Database not yet updated for price requests: fall back to the basic columns.
    let basic = db().from('suppliers').select('id, name, categories, description, website, phone, town, postcode, lat, lng, delivers_nationally').eq('status', 'approved').order('name').limit(500);
    if (category) basic = basic.contains('categories', [category]);
    if (q) { const term = q.replace(/[%_,()]/g, ' '); basic = basic.or(`name.ilike.%${term}%,description.ilike.%${term}%,town.ilike.%${term}%`); }
    ({ data, error } = await basic as unknown as { data: typeof data; error: typeof error });
  }
  // Plans that have lapsed drop out; paying suppliers (Match, then Appear) come first
  const rank = (s: Supplier) => (s.tier === 'match' ? 0 : s.tier === 'appear' ? 1 : 2);
  let rows = (audience === 'anon' ? [] : (data ?? []) as Supplier[])
    .filter((s) => s.status === undefined || isLive({ status: 'approved', tier: s.tier ?? null, subscription_status: s.subscription_status ?? 'none' }))
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
    .map((s) => ({
    ...s,
    dist: where?.ok && s.lat != null && s.lng != null ? miles(where.lat, where.lng, s.lat, s.lng) : null,
    profile: hasProfile({ status: 'approved', tier: s.tier ?? null, subscription_status: s.subscription_status ?? 'none', slug: s.slug ?? null }),
  }));
  const ratings = await ratingsFor(rows.map((r) => r.id));
  if (where?.ok) {
    // Nearest first; national suppliers without a location go after the local ones
    rows = rows.sort((a, b) => rank(a) - rank(b) || (a.dist ?? 9999) - (b.dist ?? 9999));
  }

  return (
    <div>
      <h1>Suppliers</h1>
      <p className="lead">
        Topsoil, turf, trees and hedging, fencing, paving and everything else a landscaping job needs. Free for everyone to search.
      </p>
      <p className="ok-box" style={{ marginTop: -8 }}>
        <strong>Members:</strong> send one plant or materials list to several of these suppliers and compare their prices side by side. {me.loggedIn
          ? <>Open <Link href="/account"><strong>Price requests</strong></Link> on your listing.</>
          : <><Link href="/login?next=/account">Log in</Link> and open <strong>Price requests</strong> on your listing.</>}
      </p>

      <form className="res-filters" method="get" action="/suppliers">
        <label>What do you need?
          <select name="category" defaultValue={category}>
            <option value="">All suppliers</option>
            {SUPPLIER_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </label>
        <label>Near postcode
          <input name="postcode" defaultValue={pcIn} placeholder="e.g. SG1 2AB" />
        </label>
        <label>Name or product
          <input type="search" name="q" defaultValue={q} placeholder="e.g. hedging, mesh, topsoil" />
        </label>
        <button type="submit" className="sq sq-rust">search</button>
        {(q || category || pcIn) && <Link href="/suppliers">clear</Link>}
      </form>
      {where && !where.ok && <p className="err">{where.reason}</p>}

      {audience === 'anon' && (
        <div className="ok-box">
          <strong>Make a free account to search suppliers.</strong> It takes a minute and you only need an email address.{' '}
          <Link href="/homeowners?next=/suppliers"><strong>Create a free account</strong></Link> or <Link href="/login?next=/suppliers">log in</Link>.
        </div>
      )}
      {audience === 'home' && <p className="muted small">Showing suppliers that sell to homeowners.</p>}
      {audience !== 'anon' && !rows.length && <p className="muted">No suppliers match that search yet.</p>}
      <div className="res-list">
        {rows.map((s) => (
          <div key={s.id} className={`res-card ${s.profile ? 'sup-paid' : ''}`}>
            <h2>{s.profile ? <Link href={`/suppliers/${s.slug}`}>{s.name}</Link> : s.name}</h2>
            <div className="badges">
              {s.categories.map((c) => <span key={c} className="badge ok">{supplierCategoryLabel(c)}</span>)}
              {s.delivers_nationally && <span className="badge">delivers nationally</span>}
              {s.tier === 'match' && <span className="badge ok">Match supplier</span>}
              {takesRequests(s) && <span className="badge ok">takes price requests</span>}
              {ratings[s.id] && <span className="badge" title="Rated by members after real orders"><span style={{ color: '#c98a00' }}>★</span> {ratings[s.id].avg.toFixed(1)} from {ratings[s.id].count} order{ratings[s.id].count === 1 ? '' : 's'}</span>}
            </div>
            {s.description && <p>{s.description}</p>}
            <p className="res-meta">
              {s.website && <a href={s.website} target="_blank" rel="noopener">{shortUrl(s.website)}</a>}
              {s.phone && <a href={`tel:${s.phone.replace(/\s/g, '')}`}>{s.phone}</a>}
              {s.town && <span>{s.town}</span>}
              {s.dist != null && <span>{Math.round(s.dist)} miles away</span>}
              {s.profile && (s.public_email || s.email) && <a href={`mailto:${s.public_email || s.email}`}>{s.public_email || s.email}</a>}
            </p>
            {s.profile && <p style={{ margin: '6px 0 0' }}><Link href={`/suppliers/${s.slug}`} className="sq">View company profile</Link></p>}
          </div>
        ))}
      </div>

      <div className="res-form" style={{ marginTop: 32 }}>
        <h2 style={{ margin: 0 }}>Supply the landscaping trade?</h2>
        <p style={{ margin: 0 }}>Get your own company profile with pictures and contact details, and be matched to the price requests our members send. Yearly plans from the price shown on the plans page.</p>
        <Link href="/suppliers/join" className="sq sq-rust">see supplier plans</Link>
      </div>
    </div>
  );
}
