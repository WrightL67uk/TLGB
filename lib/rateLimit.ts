import 'server-only';
import { createHash } from 'crypto';
import type { NextRequest } from 'next/server';
import { db } from './supabase';

/** The visitor's IP address, hashed so we never store it. */
export function visitor(req: NextRequest) {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  return createHash('sha256').update(`tlgb:${ip}`).digest('hex').slice(0, 32);
}

/**
 * True if `who` has already done `bucket` `max` times in the last `minutes`.
 * Otherwise records this go and returns false. If the check itself fails, it lets the request through.
 */
export async function tooMany(bucket: string, who: string, max: number, minutes: number) {
  try {
    const since = new Date(Date.now() - minutes * 60_000).toISOString();
    const { count, error } = await db().from('rate_events').select('id', { count: 'exact', head: true })
      .eq('bucket', bucket).eq('who', who).gte('created_at', since);
    if (error) return false;
    if ((count ?? 0) >= max) return true;
    await db().from('rate_events').insert({ bucket, who });
    return false;
  } catch {
    return false;
  }
}

export const TOO_MANY = 'Too many attempts from here. Please wait an hour and try again, or email admin@tlgb.co.uk.';
