import type { MetadataRoute } from 'next';
import { db } from '@/lib/supabase';
import { siteUrl } from '@/lib/config';
import { HOW_TOS } from '@/lib/howTo';
import { LEGAL_PAGES } from '@/app/legal/pages';
import { publicListings } from '@/lib/seo';
import { ADVICE } from '@/lib/advice';

export const revalidate = 3600;

const STATIC = [
  '/', '/search', '/tenders', '/leads', '/jobs', '/recruitment', '/looking-for-work', '/suppliers', '/suppliers/join',
  '/help-hub', '/guides', '/guides/finding-leads', '/guides/retention-ban', '/guides/winning-tenders',
  '/find', '/advice', '/accreditation-help', '/contact', '/supply-chains', '/contractors', '/contractors/join', '/join', '/tour', '/tools/payment-dates', '/legal',
];

/** Tells Google which pages exist: public pages, guides, approved listings and live vacancies. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();
  const out: MetadataRoute.Sitemap = [
    ...STATIC.map((p) => ({ url: `${base}${p === '/' ? '' : p}`, lastModified: now })),
    ...ADVICE.map((a) => ({ url: `${base}/advice/${a.slug}` })),
    ...HOW_TOS.map((h) => ({ url: `${base}/guides/${h.slug}` })),
    ...LEGAL_PAGES.map((l) => ({ url: `${base}/legal/${l.slug}` })),
  ];
  try {
    const [{ data: biz }, { data: vacs }, { data: sups }] = await Promise.all([
      db().from('businesses').select('id').eq('status', 'approved').limit(5000),
      db().from('vacancies').select('id, updated_at').eq('status', 'live').gt('expires_at', now.toISOString()).limit(2000),
      db().from('suppliers').select('slug').eq('status', 'approved').not('tier', 'is', null).in('subscription_status', ['active', 'trialing', 'past_due']).not('slug', 'is', null).limit(2000),
    ]);
    for (const b of biz ?? []) out.push({ url: `${base}/b/${b.id}` });
    const listings = await publicListings();
    const trades = new Set<string>(), combos = new Set<string>();
    for (const l of listings) for (const t of new Set(l.trades)) { trades.add(t); combos.add(`${t}/${l.area.toLowerCase()}`); }
    for (const t of trades) out.push({ url: `${base}/find/${t}` });
    for (const c of combos) out.push({ url: `${base}/find/${c}` });
    for (const x of sups ?? []) out.push({ url: `${base}/suppliers/${x.slug}` });
    for (const v of vacs ?? []) out.push({ url: `${base}/recruitment/vacancies/${v.id}`, lastModified: new Date(v.updated_at) });
  } catch {
    // The fixed pages are still listed if the database is unreachable
  }
  return out;
}
