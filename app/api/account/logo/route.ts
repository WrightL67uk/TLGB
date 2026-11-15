import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { ownedBusiness } from '@/lib/account';
import { PHOTO_MIME } from '@/lib/config';

export const runtime = 'nodejs';

const MAX = 2 * 1024 * 1024;
const back = (req: NextRequest, id: string, q: string) => NextResponse.redirect(new URL(`/account/${id}?${q}#logo`, req.url), 303);
const fail = (req: NextRequest, id: string, msg: string) => back(req, id, 'logo=' + encodeURIComponent(msg));

/** Add, replace or remove the logo on a trade listing. */
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const id = String(fd?.get('business_id') ?? '');
  if (!sameOrigin(req) || !fd) return NextResponse.redirect(new URL('/account', req.url), 303);
  const own = await ownedBusiness(id);
  if (!own.ok) return NextResponse.redirect(new URL('/login?next=/account', req.url), 303);
  const b = own.business as typeof own.business & { logo_path?: string | null };
  const old = b.logo_path ?? null;

  if (fd.get('action') === 'remove') {
    if (old) await db().storage.from('portfolio').remove([old]);
    await db().from('businesses').update({ logo_path: null }).eq('id', b.id);
    return back(req, id, 'logo=removed');
  }

  const file = fd.get('logo');
  if (!(file instanceof File) || !file.size) return fail(req, id, 'Choose a logo file first.');
  if (!PHOTO_MIME.includes(file.type)) return fail(req, id, 'Your logo must be a JPG, PNG or WebP picture.');
  if (file.size > MAX) return fail(req, id, 'Your logo must be under 2MB.');
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${b.id}/logo-${crypto.randomUUID()}.${ext}`;
  const up = await db().storage.from('portfolio').upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
  if (up.error) return fail(req, id, 'We could not save your logo. Try again.');
  const { error } = await db().from('businesses').update({ logo_path: path }).eq('id', b.id);
  if (error) {
    await db().storage.from('portfolio').remove([path]);
    return fail(req, id, 'We could not save your logo. Try again.');
  }
  if (old) await db().storage.from('portfolio').remove([old]);
  return back(req, id, 'logo=saved');
}
