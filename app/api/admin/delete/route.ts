import { NextRequest, NextResponse } from 'next/server';
import { deleteBusiness, deleteSupplier, deleteSeeker, deleteContractor } from '@/lib/adminDelete';

export const runtime = 'nodejs';

// Behind the admin password (middleware). Permanently deletes a member listing, supplier,
// job seeker or main contractor, with their files.
const KINDS = {
  business: { run: deleteBusiness, back: '/admin' },
  supplier: { run: deleteSupplier, back: '/admin/resources' },
  seeker: { run: deleteSeeker, back: '/admin/workers' },
  contractor: { run: deleteContractor, back: '/admin/contractors' },
} as const;

export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const kind = String(fd?.get('kind') ?? '') as keyof typeof KINDS;
  const id = String(fd?.get('id') ?? '');
  const k = KINDS[kind];
  if (!k || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.redirect(new URL('/admin', req.url), 303);
  const from = String(fd?.get('from') ?? '');
  const errBack = /^\/admin(\/[\w\-/]*)?$/.test(from) ? from : k.back;
  if (fd?.get('confirm') !== 'yes') return NextResponse.redirect(new URL(`${errBack}?delete_error=${encodeURIComponent('Tick the box to confirm before deleting.')}`, req.url), 303);
  const r = await k.run(id);
  if (!r.ok) return NextResponse.redirect(new URL(`${errBack}?delete_error=${encodeURIComponent(r.error)}`, req.url), 303);
  return NextResponse.redirect(new URL(`${k.back}?deleted=${encodeURIComponent(r.name)}`, req.url), 303);
}
