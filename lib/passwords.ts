import 'server-only';
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { db } from './supabase';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;
const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export const MIN_PASSWORD = 8;

/** Plain-English problem with a new password, or null if it is fine. */
export function passwordProblem(pw: unknown): string | null {
  const s = typeof pw === 'string' ? pw : '';
  if (s.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (s.length > 200) return 'That password is too long.';
  if (/^(password|12345678|qwerty)/i.test(s)) return 'That password is too easy to guess.';
  return null;
}

export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 32, PARAMS);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function matches(pw: string, stored: string) {
  const [alg, saltB64, keyB64] = stored.split('$');
  if (alg !== 'scrypt' || !saltB64 || !keyB64) return false;
  const want = Buffer.from(keyB64, 'base64');
  const got = await scrypt(pw, Buffer.from(saltB64, 'base64'), want.length, PARAMS);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function setPassword(email: string, pw: string) {
  const password_hash = await hashPassword(pw);
  return db().from('login_passwords').upsert({ email: email.toLowerCase(), password_hash, updated_at: new Date().toISOString() });
}

export async function hasPassword(email: string) {
  const { count } = await db().from('login_passwords').select('email', { count: 'exact', head: true }).eq('email', email.toLowerCase());
  return (count ?? 0) > 0;
}

/** Too many wrong passwords recently, for this email or from this connection. */
export async function lockedOut(email: string, ip: string) {
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const [{ count: byEmail }, { count: byIp }] = await Promise.all([
    db().from('login_attempts').select('id', { count: 'exact', head: true }).eq('email', email).eq('ok', false).gte('created_at', since),
    db().from('login_attempts').select('id', { count: 'exact', head: true }).eq('ip', ip).eq('ok', false).gte('created_at', since),
  ]);
  return (byEmail ?? 0) >= 8 || (byIp ?? 0) >= 30;
}

/** True if the password is right for this email. Every attempt is recorded for the lockout. */
export async function checkPassword(email: string, pw: string, ip: string) {
  const { data } = await db().from('login_passwords').select('password_hash').eq('email', email).maybeSingle();
  // Do the same work whether or not the email has a password, so timing gives nothing away.
  const ok = data ? await matches(pw, data.password_hash) : (await matches(pw, 'scrypt$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='), false);
  await db().from('login_attempts').insert({ email, ip, ok });
  return ok;
}

/** Whether this email belongs to a trade listing, supplier, contractor user or job seeker that can log in. */
export async function canLogIn(email: string) {
  const [{ count: b }, { count: c }, { count: j }, { count: sp }, { count: h }] = await Promise.all([
    db().from('businesses').select('id', { count: 'exact', head: true }).eq('email', email).neq('status', 'draft'),
    db().from('contractor_users').select('id', { count: 'exact', head: true }).eq('email', email).is('removed_at', null),
    db().from('job_seekers').select('id', { count: 'exact', head: true }).eq('email', email).neq('status', 'removed'),
    db().from('suppliers').select('id', { count: 'exact', head: true }).eq('email', email).neq('status', 'rejected'),
    db().from('home_users').select('id', { count: 'exact', head: true }).eq('email', email).neq('status', 'removed'),
  ]);
  return (b ?? 0) + (c ?? 0) + (j ?? 0) + (sp ?? 0) + (h ?? 0) > 0;
}
