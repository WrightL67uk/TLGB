import { NextRequest, NextResponse } from 'next/server';
import { importLeads } from '@/lib/leads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Admin button: pull leads now (behind the admin password via middleware). */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const days = Math.min(30, Math.max(1, Number(form?.get('days') ?? 14) || 14));
  try {
    const r = await importLeads({ days });
    const detail = Object.entries(r.bySource).map(([k, v]) => `${k}:${v}`).join(', ');
    return NextResponse.redirect(new URL(`/admin?leads=${encodeURIComponent(`${r.saved} leads saved (${detail})`)}`, req.url), 303);
  } catch (err) {
    console.error(err);
    return NextResponse.redirect(new URL('/admin?leads=Import%20failed', req.url), 303);
  }
}
