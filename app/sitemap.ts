import type { MetadataRoute } from 'next';
import { db } from '@/lib/supabase';
import { siteUrl } from '@/lib/config';
import { HOW_TOS } from '@/lib/howTo';
import { LEGAL_PAGES } from '@/app/legal/pages';

export const revalidate = 3600;

const STATIC = [
  '/', '/search', '/tenders', '/leads', '/jobs', '/recruitment', '/looking-for-work', '/suppliers', '/suppliers/join',
  '/help-hub', '/guides', '/guides/finding-leads', '/guides/retention-ban', '/guides/winning-tenders',
  '/accreditation-help', '/supply-chains', '/contractors', '/contractors/join', '/join', '/tour', '/tools/payment-dates', '/legal',
];

/** Tells Google which pages exist: public pages, guides, approved listings and live vacancies. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();
  const out: MetadataRoute.Sitemap = [
    ...STATIC.map((p) => ({ url: `${base}${p === '/' ? '' : p}`, lastModified: now })),
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
    for (const x of sups ?? []) out.push({ url: `${base}/suppliers/${x.slug}` });
    for (const v of vacs ?? []) out.push({ url: `${base}/recruitment/vacancies/${v.id}`, lastModified: new Date(v.updated_at) });
  } catch {
    // The fixed pages are still listed if the database is unreachable
  }
  return out;
}
