import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { sameOrigin, destroySession, SESSION_COOKIE } from '@/lib/session';
import { getSeeker } from '@/lib/seekers';
import { SEEKER_LIVE_DAYS } from '@/lib/seekerTypes';

export const runtime = 'nodejs';

/** Pause, keep live or delete a job seeker profile. */
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const go = (q: string, path = '/seeker') => NextResponse.redirect(new URL(`${path}?${q}`, req.url), 303);
  if (!fd || !sameOrigin(req)) return go('error=' + encodeURIComponent('Please use the buttons on our website.'));
  const me = await getSeeker();
  if (!me) return NextResponse.redirect(new URL('/login?next=/seeker', req.url), 303);
  const action = String(fd.get('action') ?? '');
  const now = new Date();

  if (action === 'pause') {
    await db().from('job_seekers').update({ status: 'paused', updated_at: now.toISOString() }).eq('id', me.id);
    return go('paused=1');
  }
  if (action === 'renew') {
    if (!me.headline || !me.postcode) return go('error=' + encodeURIComponent('Finish your profile first, then publish it.'));
    await db().from('job_seekers').update({
      status: 'live', published_at: me.published_at ?? now.toISOString(),
      expires_at: new Date(now.getTime() + SEEKER_LIVE_DAYS * 86_400_000).toISOString(), expiry_warned_at: null, updated_at: now.toISOString(),
    }).eq('id', me.id);
    return go('published=1');
  }
  if (action === 'delete') {
    if (fd.get('confirm') !== 'yes') return go('error=' + encodeURIComponent('Tick the box to confirm you want to delete your profile.'));
    await db().from('job_seekers').delete().eq('id', me.id);
    // Log out too, unless this login is also a trade or contractor account
    const { count: biz } = await db().from('businesses').select('id', { count: 'exact', head: true }).eq('email', me.email);
    const { count: cu } = await db().from('contractor_users').select('id', { count: 'exact', head: true }).eq('email', me.email).is('removed_at', null);
    if (!biz && !cu) {
      await destroySession(req.cookies.get(SESSION_COOKIE)?.value);
      const res = go('deleted=1', '/looking-for-work');
      res.cookies.delete(SESSION_COOKIE);
      return res;
    }
    return go('deleted=1', '/looking-for-work');
  }
  return go('error=' + encodeURIComponent('Unknown action.'));
}
