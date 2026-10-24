import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { packOwner, newToken } from '@/lib/compliance';
import { SHARE_KEYS } from '@/lib/complianceTypes';
import { siteUrl } from '@/lib/config';

export const runtime = 'nodejs';

const Body = z.object({
  businessId: z.string(),
  label: z.string().trim().min(2, 'Say who the link is for').max(80),
  include: z.array(z.enum(SHARE_KEYS)).min(1, 'Tick at least one section to share'),
  days: z.union([z.literal(30), z.literal(90), z.literal(180), z.literal(365), z.null()]),
});
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

/** Creates a share link for the pack. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail('Request blocked.', 403);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const own = await packOwner(parsed.data.businessId);
  if (!own.ok) return fail(own.error, own.status as 401);

  const { count } = await db().from('pack_links').select('id', { count: 'exact', head: true })
    .eq('business_id', own.business.id).is('revoked_at', null);
  if ((count ?? 0) >= 100) return fail('You have 100 live links. Switch some old ones off first.');

  const { label, include, days } = parsed.data;
  for (let attempt = 0; attempt < 3; attempt++) {
    const token = newToken(label);
    const { error } = await db().from('pack_links').insert({
      business_id: own.business.id,
      token,
      label,
      include: [...new Set(include)],
      expires_at: days ? new Date(Date.now() + days * 86_400_000).toISOString() : null,
    });
    if (!error) return NextResponse.json({ ok: true, url: `${siteUrl()}/pack/${token}` });
    if (error.code !== '23505') break; // only retry a clash on the token
  }
  return fail('Could not create the link. Try again.', 500);
}
