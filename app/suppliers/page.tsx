import Link from 'next/link';
import '../resources.css';
import { db } from '@/lib/supabase';
import { lookupPostcode } from '@/lib/postcodes';
import { SUPPLIER_CATEGORIES, supplierCategoryLabel, miles, shortUrl } from '@/lib/resources';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Suppliers | The Little Green Book',
  description: 'Landscaping suppliers: topsoil, turf, trees and hedging, fencing, paving, tree pits, artificial grass and more. Free to search.',
};

type Supplier = {
  id: string; name: string; categories: string[]; description: string | null; website: string | null; phone: string | null;
  town: string | null; postcode: string | null; lat: number | null; lng: number | null; delivers_nationally: boolean;
};
type SP = Promise<{ q?: string; category?: string; postcode?: string }>;

export default async function SuppliersPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim().slice(0, 80);
  const category = SUPPLIER_CATEGORIES.some((c) => c.key === sp.category) ? sp.category! : '';
  const pcIn = (sp.postcode ?? '').trim().slice(0, 10);
  const where = pcIn ? await lookupPostcode(pcIn) : null;

  let query = db()
    .from('suppliers')
    .select('id, name, categories, description, website, phone, town, postcode, lat, lng, delivers_nationally')
    .eq('status', 'approved')
    .order('name')
    .limit(500);
  if (category) query = query.contains('categories', [category]);
  if (q) {
    const term = q.replace(/[%_,()]/g, ' ');
    query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%,town.ilike.%${term}%`);
  }
  const { data } = await query;
  let rows = ((data ?? []) as Supplier[]).map((s) => ({
    ...s,
    dist: where?.ok && s.lat != null && s.lng != null ? miles(where.lat, where.lng, s.lat, s.lng) : null,
  }));
  if (where?.ok) {
    // Nearest first; national suppliers without a location go after the local ones
    rows = rows.sort((a, b) => (a.dist ?? 9999) - (b.dist ?? 9999));
  }

  return (
    <div>
      <h1>Suppliers</h1>
      <p className="lead">
        Topsoil, turf, trees and hedging, fencing, paving and everything else a landscaping job needs. Free for everyone to search.
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

      {!rows.length && <p className="muted">No suppliers match that search yet.</p>}
      <div className="res-list">
        {rows.map((s) => (
          <div key={s.id} className="res-card">
            <h2>{s.name}</h2>
            <div className="badges">
              {s.categories.map((c) => <span key={c} className="badge ok">{supplierCategoryLabel(c)}</span>)}
              {s.delivers_nationally && <span className="badge">delivers nationally</span>}
            </div>
            {s.description && <p>{s.description}</p>}
            <p className="res-meta">
              {s.website && <a href={s.website} target="_blank" rel="noopener">{shortUrl(s.website)}</a>}
              {s.phone && <a href={`tel:${s.phone.replace(/\s/g, '')}`}>{s.phone}</a>}
              {s.town && <span>{s.town}</span>}
              {s.dist != null && <span>{Math.round(s.dist)} miles away</span>}
            </p>
          </div>
        ))}
      </div>

      <div className="res-form" style={{ marginTop: 32 }}>
        <h2 style={{ margin: 0 }}>Supply the landscaping trade?</h2>
        <p style={{ margin: 0 }}>Listing is free. Tell us about your business and we will add you once we have checked the details.</p>
        <Link href="/suppliers/add" className="sq sq-rust">list your supply business</Link>
      </div>
    </div>
  );
}
