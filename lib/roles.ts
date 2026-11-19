import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextRequest, NextResponse } from 'next/server';
import { db } from './supabase';
import { createSession, destroySession, getSessionEmail, sessionCookieOptions, SESSION_COOKIE } from './session';
import { ADMIN_COOKIE, endAdminSession } from './adminAuth';

// One sign-in, one role at a time. A person picks what they are when they log in (trade, supplier,
// recruitment agency, job seeker, main contractor). The choice is kept in a cookie next to the session.
// It is not a security boundary: every page still checks the email owns what it shows. It stops one
// browser acting as two kinds of user at once. Sessions with no role cookie (older logins) work as before.

export const ROLE_COOKIE = 'tlgb_role';

export type Role = 'trade' | 'supplier' | 'agency' | 'seeker' | 'contractor';

export const ROLES: { key: Role; label: string; short: string }[] = [
  { key: 'trade', label: 'A trade or subcontractor', short: 'trade' },
  { key: 'supplier', label: 'A supplier', short: 'supplier' },
  { key: 'agency', label: 'A recruitment agency', short: 'recruitment agency' },
  { key: 'seeker', label: 'Looking for work', short: 'job seeker' },
  { key: 'contractor', label: 'A main contractor or housebuilder', short: 'main contractor' },
];

export const isRole = (v: unknown): v is Role => ROLES.some((r) => r.key === v);
export const roleShort = (r: Role) => ROLES.find((x) => x.key === r)!.short;

/** The role an in-site path belongs to, if it belongs to one. */
export function roleFromPath(path: string): Role | null {
  if (/^\/account(\/|$|\?)/.test(path)) return 'trade';
  if (/^\/supplier(\/|$|\?)/.test(path)) return 'supplier';
  if (/^\/recruiter(\/|$|\?)/.test(path)) return 'agency';
  if (/^\/seeker(\/|$|\?)/.test(path)) return 'seeker';
  if (/^\/contractor(\/|$|\?)/.test(path)) return 'contractor';
  return null;
}

/** Which roles this email holds. */
export async function rolesOf(email: string): Promise<Role[]> {
  const [{ count: b }, { count: s }, { count: a }, { count: j }, { count: c }] = await Promise.all([
    db().from('businesses').select('id', { count: 'exact', head: true }).eq('email', email).neq('status', 'draft'),
    db().from('suppliers').select('id', { count: 'exact', head: true }).eq('email', email).neq('status', 'rejected'),
    db().from('agencies').select('id', { count: 'exact', head: true }).eq('email', email).neq('status', 'rejected'),
    db().from('job_seekers').select('id', { count: 'exact', head: true }).eq('email', email).neq('status', 'removed'),
    db().from('contractor_users').select('id', { count: 'exact', head: true }).eq('email', email).is('removed_at', null),
  ]);
  const out: Role[] = [];
  if (b) out.push('trade');
  if (s) out.push('supplier');
  if (a) out.push('agency');
  if (j) out.push('seeker');
  if (c) out.push('contractor');
  return out;
}

/** Where each role lands after logging in. */
export async function homeFor(role: Role, email: string): Promise<string> {
  if (role === 'agency') return '/recruiter';
  if (role === 'seeker') return '/seeker';
  if (role === 'contractor') return '/contractor';
  if (role === 'supplier') {
    const { data } = await db().from('suppliers').select('id').eq('email', email).neq('status', 'rejected').order('created_at').limit(1);
    return data?.length ? `/supplier/${data[0].id}` : '/account';
  }
  return '/account';
}

/**
 * Work out the role for a new session: the one asked for, else the one the destination belongs to,
 * else the only one the email holds. Null when it is unclear (the session then works as it always did).
 */
export async function pickRole(email: string, asked: unknown, next: string): Promise<{ role: Role | null; missing: Role | null }> {
  const held = await rolesOf(email);
  const want = isRole(asked) ? asked : roleFromPath(next);
  if (want) return held.includes(want) ? { role: want, missing: null } : { role: held.length === 1 ? held[0] : null, missing: isRole(asked) ? want : null };
  return { role: held.length === 1 ? held[0] : null, missing: null };
}

/** The role on the current request, if there is one. */
export async function currentRole(): Promise<Role | null> {
  const v = (await cookies()).get(ROLE_COOKIE)?.value;
  return isRole(v) ? v : null;
}

/**
 * Start a member session. Signs out any admin login and any earlier member session in this browser first,
 * so only one thing is ever logged in. Call apply(response) to set the cookies.
 */
export async function startSession(req: NextRequest, email: string, role: Role | null) {
  await Promise.all([
    destroySession(req.cookies.get(SESSION_COOKIE)?.value),
    endAdminSession(req.cookies.get(ADMIN_COOKIE)?.value),
  ]);
  const { raw, expires } = await createSession(email);
  return {
    apply<T extends NextResponse>(res: T): T {
      res.cookies.set(SESSION_COOKIE, raw, sessionCookieOptions(expires));
      if (role) res.cookies.set(ROLE_COOKIE, role, sessionCookieOptions(expires));
      else res.cookies.delete(ROLE_COOKIE);
      res.cookies.delete(ADMIN_COOKIE);
      return res;
    },
  };
}

/** Signs out a member session in this browser (used when an admin logs in). */
export async function endMemberSession(req: NextRequest, res: NextResponse) {
  await destroySession(req.cookies.get(SESSION_COOKIE)?.value);
  res.cookies.delete(SESSION_COOKIE);
  res.cookies.delete(ROLE_COOKIE);
}

/** For the top of a role's pages: someone logged in as another role is asked to switch. */
export async function requireRole(role: Role) {
  const cur = await currentRole();
  if (cur && cur !== role && (await getSessionEmail())) redirect(`/login/switch?to=${role}`);
}
