import 'server-only';
import { db, photoUrl } from './supabase';
import { isPaid } from './membership';
import { tradeLabel } from './config';

export const SITE_DOMAIN = 'tlgb.co.uk';
export const siteAddress = (slug: string) => `${slug}.${SITE_DOMAIN}`;
export const siteHref = (slug: string) => `https://${siteAddress(slug)}`;

/** Names that can never be a member's address. */
export const RESERVED = new Set([
  'www', 'admin', 'api', 'app', 'mail', 'email', 'smtp', 'imap', 'pop', 'webmail', 'autodiscover', 'autoconfig', 'em5702',
  'ftp', 'cdn', 'static', 'assets', 'img', 'images', 'help', 'support', 'blog', 'news', 'shop', 'store', 'jobs', 'leads',
  'tlgb', 'littlegreenbook', 'thelittlegreenbook', 'login', 'account', 'dashboard', 'status', 'test', 'dev', 'staging',
  'preview', 'contractors', 'suppliers', 'workers', 'guides', 'legal', 'billing', 'payments', 'docs',
]);

export const slugOk = (s: string) => /^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$/.test(s) && !s.includes('--') && !RESERVED.has(s);

export function suggestSlug(name: string) {
  return name.toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(ltd|limited|llp|plc|uk|the)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 40) || 'mysite';
}

export const THEMES: { key: string; label: string; dark: string; mid: string; accent: string; soft: string; tint: string }[] = [
  { key: 'forest', label: 'Forest green', dark: '#14331f', mid: '#2f6b2a', accent: '#b8562a', soft: '#eef5e6', tint: '#a9d47a' },
  { key: 'slate', label: 'Slate and lime', dark: '#1f2a33', mid: '#3c5566', accent: '#6fa83a', soft: '#eaf0f3', tint: '#b9dd8c' },
  { key: 'earth', label: 'Earth and terracotta', dark: '#3a2a1e', mid: '#6b4a2f', accent: '#c0612f', soft: '#f6efe7', tint: '#e8c39b' },
  { key: 'navy', label: 'Navy and gold', dark: '#16233f', mid: '#2c4470', accent: '#c99a2e', soft: '#eef1f7', tint: '#e9cf8c' },
];
export const theme = (k: string | null | undefined) => THEMES.find((t) => t.key === k) ?? THEMES[0];

export type Service = { title: string; text: string };
export type MemberSite = {
  id: string; business_id: string; slug: string; status: 'draft' | 'live' | 'off'; theme: string;
  headline: string | null; intro: string | null; about: string | null; services: Service[]; reasons: string[];
  areas: string | null; hero_photo: string | null; show_phone: boolean; show_email: boolean;
  written_by: string | null; published_at: string | null; views: number; enquiries: number; updated_at: string;
};
export type SiteBusiness = {
  id: string; trading_name: string; contact_name: string; email: string; phone: string | null; website: string | null;
  description: string | null; base_postcode: string; radius_miles: number | null; trades: string[]; accreditations: string[];
  pl_cover_amount: number | null; pl_expiry: string | null; status: string; founding_member: boolean; subscription_status: string;
  ch_incorporated_on: string | null; business_type: string;
};

const BUSINESS_COLS = 'id, trading_name, contact_name, email, phone, website, description, base_postcode, radius_miles, trades, accreditations, pl_cover_amount, pl_expiry, status, founding_member, subscription_status, ch_incorporated_on, business_type';

/** A member may have a site while their listing is approved and membership paid (or founding). */
export const siteAllowed = (b: Pick<SiteBusiness, 'status' | 'founding_member' | 'subscription_status'>) =>
  b.status === 'approved' && isPaid(b as never);

export async function loadSiteBySlug(slug: string) {
  if (!slugOk(slug)) return null;
  const { data: site } = await db().from('member_sites').select('*').eq('slug', slug).maybeSingle();
  if (!site) return null;
  return withBusiness(site as MemberSite);
}

export async function loadSiteForBusiness(businessId: string) {
  const { data: site } = await db().from('member_sites').select('*').eq('business_id', businessId).maybeSingle();
  return (site as MemberSite | null) ?? null;
}

async function withBusiness(site: MemberSite) {
  const [{ data: b }, { data: photos }] = await Promise.all([
    db().from('businesses').select(BUSINESS_COLS).eq('id', site.business_id).maybeSingle(),
    db().from('business_photos').select('storage_path, caption, sort_order').eq('business_id', site.business_id).order('sort_order'),
  ]);
  if (!b) return null;
  return {
    site, business: b as SiteBusiness,
    photos: (photos ?? []).map((p) => ({ path: p.storage_path as string, url: photoUrl(p.storage_path), caption: (p.caption as string | null) ?? null })),
  };
}

export async function loadBusinessForSite(businessId: string) {
  const { data } = await db().from('businesses').select(BUSINESS_COLS).eq('id', businessId).maybeSingle();
  return (data as SiteBusiness | null) ?? null;
}

export const pounds = (n: number) => (n >= 1_000_000 ? `£${(n / 1_000_000).toLocaleString('en-GB', { maximumFractionDigits: 1 })}m` : `£${n.toLocaleString('en-GB')}`);
export const tradesText = (t: string[]) => t.map(tradeLabel);
export const insuranceOk = (b: Pick<SiteBusiness, 'pl_expiry'>) => !!b.pl_expiry && b.pl_expiry >= new Date().toISOString().slice(0, 10);
export const sinceYear = (b: Pick<SiteBusiness, 'ch_incorporated_on'>) => (b.ch_incorporated_on ? Number(b.ch_incorporated_on.slice(0, 4)) : null);
