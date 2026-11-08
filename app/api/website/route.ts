import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { ownedBusiness } from '@/lib/account';
import { sameOrigin } from '@/lib/session';
import { slugOk, siteAllowed, loadSiteForBusiness, loadBusinessForSite, siteAddress, THEMES, RESERVED } from '@/lib/memberSites';
import { writeSiteCopy } from '@/lib/siteWriter';
import { emailAdminSitePublished } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const themeKeys = THEMES.map((t) => t.key) as [string, ...string[]];

const Save = z.object({
  slug: z.string().trim().toLowerCase(),
  theme: z.enum(themeKeys),
  headline: z.string().trim().min(3, 'Add a headline').max(120),
  intro: z.string().trim().max(400),
  about: z.string().trim().max(3000),
  services: z.array(z.object({ title: z.string().trim().max(60), text: z.string().trim().max(300) })).max(9),
  reasons: z.array(z.string().trim().max(200)).max(6),
  areas: z.string().trim().max(300),
  hero_photo: z.string().max(300).nullable(),
  show_phone: z.boolean(),
  show_email: z.boolean(),
});

async function slugProblem(slug: string, siteId?: string) {
  if (RESERVED.has(slug)) return 'That address is reserved. Please pick another.';
  if (!slugOk(slug)) return 'Use 3 to 40 lower-case letters, numbers or single hyphens, starting and ending with a letter or number.';
  const { data } = await db().from('member_sites').select('id').eq('slug', slug).maybeSingle();
  if (data && data.id !== siteId) return 'Someone already has that address. Please pick another.';
  return null;
}

/** The member's website editor: create, save, rewrite wording, publish and unpublish. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail('Please use the form on our website.', 403);
  const body = await req.json().catch(() => null);
  if (!body || typeof body.businessId !== 'string') return fail('Something went wrong. Please try again.');
  const own = await ownedBusiness(body.businessId);
  if (!own.ok) return fail(own.error, own.status);
  const biz = await loadBusinessForSite(own.business.id);
  if (!biz) return fail('Listing not found.', 404);
  if (!siteAllowed(biz)) return fail('Websites are included with paid membership of an approved listing.', 403);
  const site = await loadSiteForBusiness(biz.id);
  const action = String(body.action ?? '');

  if (action === 'create') {
    if (site) return NextResponse.json({ ok: true });
    const slug = String(body.slug ?? '').trim().toLowerCase();
    const problem = await slugProblem(slug);
    if (problem) return fail(problem);
    const theme = themeKeys.includes(body.theme) ? body.theme : 'forest';
    const copy = await writeSiteCopy(biz);
    const { data: photo } = await db().from('business_photos').select('storage_path').eq('business_id', biz.id).order('sort_order').limit(1).maybeSingle();
    const { error } = await db().from('member_sites').insert({
      business_id: biz.id, slug, theme, ...copy, hero_photo: photo?.storage_path ?? null,
    });
    if (error) { console.error('site create failed', error); return fail('Something went wrong creating your website. Please try again.', 500); }
    return NextResponse.json({ ok: true });
  }

  if (!site) return fail('Create your website first.');

  if (action === 'save') {
    const p = Save.safeParse(body.site);
    if (!p.success) return fail(p.error.issues[0]?.message ?? 'Please check the form.');
    const d = p.data;
    if (d.slug !== site.slug) { const problem = await slugProblem(d.slug, site.id); if (problem) return fail(problem); }
    if (d.hero_photo) {
      const { data: ph } = await db().from('business_photos').select('storage_path').eq('business_id', biz.id).eq('storage_path', d.hero_photo).maybeSingle();
      if (!ph) d.hero_photo = null;
    }
    const { error } = await db().from('member_sites').update({
      ...d,
      services: d.services.filter((s) => s.title),
      reasons: d.reasons.filter(Boolean),
      updated_at: new Date().toISOString(),
    }).eq('id', site.id);
    if (error) { console.error('site save failed', error); return fail('Something went wrong saving. Please try again.', 500); }
    return NextResponse.json({ ok: true, slug: d.slug });
  }

  if (action === 'rewrite') {
    const copy = await writeSiteCopy(biz);
    await db().from('member_sites').update({ ...copy, updated_at: new Date().toISOString() }).eq('id', site.id);
    return NextResponse.json({ ok: true });
  }

  if (action === 'publish') {
    if (!site.headline) return fail('Add a headline before publishing.');
    await db().from('member_sites').update({ status: 'live', published_at: site.published_at ?? new Date().toISOString() }).eq('id', site.id);
    if (site.status !== 'live') await emailAdminSitePublished(biz.trading_name, siteAddress(site.slug));
    return NextResponse.json({ ok: true });
  }

  if (action === 'unpublish') {
    await db().from('member_sites').update({ status: 'off' }).eq('id', site.id);
    return NextResponse.json({ ok: true });
  }

  return fail('Unknown action.');
}
