import 'server-only';
import { cookies } from 'next/headers';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { db } from './supabase';
import { hashPassword, matches } from './passwords';

// Admin logins. Each admin has an email and password (only a scrypt hash is stored).
// The Vercel ADMIN_USERNAME / ADMIN_PASSWORD pair still works as a master login.
// Sessions are random tokens; only their SHA-256 hash is stored. middleware.ts checks them.

export const ADMIN_COOKIE = 'tlgb_admin';
const SESSION_DAYS = 7;
export const INVITE_HOURS = 72;
export const RESET_MINUTES = 60;

const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const newToken = () => randomBytes(32).toString('base64url');

export type AdminUser = { id: string; name: string; email: string };
export type Me = { id: string | null; name: string; email: string | null };

function same(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** The master login from Vercel, if these match it. */
export function isMaster(username: string, password: string) {
  // Forgiving about stray spaces or line breaks pasted into Vercel, and about capitals in the username.
  const u = (process.env.ADMIN_USERNAME ?? '').trim().toLowerCase(), p = process.env.ADMIN_PASSWORD ?? '';
  if (!u || !p) return false;
  const userOk = same(username.trim().toLowerCase(), u);
  const passOk = same(password, p) || same(password.trim(), p.trim());
  return userOk && passOk;
}

export async function checkAdminPassword(email: string, pw: string): Promise<AdminUser | null> {
  const { data } = await db().from('admin_users').select('id, name, email, password_hash').ilike('email', email).is('removed_at', null).maybeSingle();
  const ok = data?.password_hash ? await matches(pw, data.password_hash) : (await matches(pw, 'scrypt$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='), false);
  return ok && data ? { id: data.id, name: data.name, email: data.email } : null;
}

export async function createAdminSession(adminId: string | null, label: string) {
  const raw = newToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const { error } = await db().from('admin_sessions').insert({ token_hash: hash(raw), admin_id: adminId, label, expires_at: expires.toISOString() });
  if (error) throw error;
  if (adminId) await db().from('admin_users').update({ last_login_at: new Date().toISOString() }).eq('id', adminId);
  return { raw, expires };
}

export const adminCookieOptions = (expires: Date) => ({
  httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', expires,
});

export async function endAdminSession(raw: string | undefined) {
  if (raw) await db().from('admin_sessions').delete().eq('token_hash', hash(raw));
}

/** Who is logged in to admin, or null. */
export async function currentAdmin(): Promise<Me | null> {
  const raw = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!raw || raw.length > 200) return null;
  const { data } = await db().from('admin_sessions').select('admin_id, label, expires_at').eq('token_hash', hash(raw)).maybeSingle();
  if (!data || new Date(data.expires_at) < new Date()) return null;
  if (!data.admin_id) return { id: null, name: data.label, email: null };
  const { data: u } = await db().from('admin_users').select('id, name, email').eq('id', data.admin_id).is('removed_at', null).maybeSingle();
  return u ? { id: u.id, name: u.name, email: u.email } : null;
}

/** A one-time link token for setting a password (invite or reset). Returns the raw token. */
export async function issueAdminToken(adminId: string, minutes: number) {
  const raw = newToken();
  await db().from('admin_users').update({ token_hash: hash(raw), token_expires_at: new Date(Date.now() + minutes * 60_000).toISOString() }).eq('id', adminId);
  return raw;
}

/** The admin a set-password link belongs to, if it is still valid. */
export async function adminForToken(raw: string): Promise<AdminUser | null> {
  if (!raw || raw.length > 200) return null;
  const { data } = await db().from('admin_users').select('id, name, email, token_expires_at').eq('token_hash', hash(raw)).is('removed_at', null).maybeSingle();
  if (!data || !data.token_expires_at || new Date(data.token_expires_at) < new Date()) return null;
  return { id: data.id, name: data.name, email: data.email };
}

export async function setAdminPassword(adminId: string, pw: string) {
  const password_hash = await hashPassword(pw);
  return db().from('admin_users').update({ password_hash, token_hash: null, token_expires_at: null }).eq('id', adminId);
}
