import 'server-only';
import { cookies } from 'next/headers';
import { createHash, randomBytes } from 'crypto';
import { db } from './supabase';

// Trade logins work by one-time email links. We store only SHA-256 hashes of
// the link and session tokens, so a database leak can't be used to log in.

export const SESSION_COOKIE = 'tlgb_session';
const SESSION_DAYS = 30;

const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const newToken = () => randomBytes(32).toString('base64url');

export async function createLoginToken(email: string, minutes: number, createdBy = 'self') {
  const raw = newToken();
  const { error } = await db().from('login_tokens').insert({
    email,
    token_hash: hash(raw),
    expires_at: new Date(Date.now() + minutes * 60_000).toISOString(),
    created_by: createdBy,
  });
  if (error) throw error;
  return raw;
}

/** Self-service links requested for this email in the last hour (rate limit). */
export async function recentLoginRequests(email: string) {
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await db()
    .from('login_tokens')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .eq('created_by', 'self')
    .gte('created_at', since);
  return count ?? 0;
}

/** Marks the token used and returns its email, or null if invalid, used or expired. */
export async function consumeLoginToken(raw: string): Promise<string | null> {
  if (!raw || raw.length > 200) return null;
  const now = new Date().toISOString();
  const { data } = await db()
    .from('login_tokens')
    .update({ used_at: now })
    .eq('token_hash', hash(raw))
    .is('used_at', null)
    .gt('expires_at', now)
    .select('email')
    .maybeSingle();
  return (data?.email as string | undefined) ?? null;
}

export async function createSession(email: string) {
  const raw = newToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const { error } = await db().from('sessions').insert({
    email,
    token_hash: hash(raw),
    expires_at: expires.toISOString(),
  });
  if (error) throw error;
  return { raw, expires };
}

export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    expires,
  };
}

/** Email of the logged-in trade, or null. */
export async function getSessionEmail(): Promise<string | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw || raw.length > 200) return null;
  const { data } = await db()
    .from('sessions')
    .select('email, expires_at')
    .eq('token_hash', hash(raw))
    .maybeSingle();
  if (!data || new Date(data.expires_at) < new Date()) return null;
  return data.email as string;
}

export async function destroySession(raw: string | undefined) {
  if (raw) await db().from('sessions').delete().eq('token_hash', hash(raw));
}

/** A same-site path to send someone back to after login, or the fallback. */
export function safeNext(v: unknown, fallback = '/account') {
  const s = typeof v === 'string' ? v : '';
  return /^\/(?![\/\\])[^\s\\]{0,199}$/.test(s) ? s : fallback;
}

/** Blocks requests started by other websites (belt and braces on top of SameSite cookies). */
export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
