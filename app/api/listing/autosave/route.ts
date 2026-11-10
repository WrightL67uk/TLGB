import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { ownedBusiness } from '@/lib/account';

export const runtime = 'nodejs';

const TEXT = ['trading_name', 'owner_full_name', 'business_address', 'contact_name', 'phone', 'website', 'base_postcode', 'radius_miles',
  'pl_cover_amount', 'pl_expiry', 'el_cover_amount', 'el_expiry', 'description'];
const LISTS = ['trades', 'accreditations'];

/** Saves the details form as they type, for listings not yet sent for approval. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false }, { status: 403 });
  const body = await req.json().catch(() => null);
  const own = await ownedBusiness(String(body?.id ?? ''));
  if (!own.ok) return NextResponse.json({ ok: false }, { status: own.status });
  if (own.business.status !== 'started') return NextResponse.json({ ok: false, error: 'Already sent' }, { status: 409 });

  const raw = (body?.data ?? {}) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  for (const k of TEXT) if (typeof raw[k] === 'string') data[k] = (raw[k] as string).slice(0, k === 'description' ? 2000 : 300);
  for (const k of LISTS) if (Array.isArray(raw[k])) data[k] = (raw[k] as unknown[]).filter((x) => typeof x === 'string').slice(0, 60);
  if (raw.accreditation_expiries && typeof raw.accreditation_expiries === 'object') {
    data.accreditation_expiries = Object.fromEntries(Object.entries(raw.accreditation_expiries as Record<string, unknown>)
      .filter(([, v]) => typeof v === 'string').slice(0, 60).map(([k, v]) => [k.slice(0, 40), String(v).slice(0, 10)]));
  }
  const tn = typeof data.trading_name === 'string' ? data.trading_name.trim() : '';
  const { error } = await db().from('businesses').update({
    draft_data: data,
    ...(tn.length >= 2 ? { trading_name: tn.slice(0, 120) } : {}),
  }).eq('id', own.business.id).eq('status', 'started');
  return NextResponse.json({ ok: !error });
}
