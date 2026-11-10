import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { emailSupplierApproved } from '@/lib/email';

export const runtime = 'nodejs';

// Behind the admin password (middleware). One endpoint for the small admin actions on
// suppliers, enquiries and Help Hub requests.
const ACTIONS: Record<string, Record<string, Record<string, unknown>>> = {
  suppliers: { approve: { status: 'approved' }, reject: { status: 'rejected' } },
  service_enquiries: { handled: { handled: true } },
  help_requests: { remove: { status: 'removed' } },
};

export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const table = String(fd?.get('table') ?? '');
  const id = String(fd?.get('id') ?? '');
  const change = ACTIONS[table]?.[String(fd?.get('action') ?? '')];
  if (change && /^[0-9a-f-]{36}$/i.test(id)) {
    const { data: before } = table === 'suppliers' ? await db().from('suppliers').select('status, name, email, wants_requests').eq('id', id).maybeSingle() : { data: null };
    const { error } = await db().from(table).update(change).eq('id', id);
    if (error) console.error('admin resources action failed', error);
    else if (before && before.status !== 'approved' && change.status === 'approved' && before.email) {
      await emailSupplierApproved(before.email, before.name, !!before.wants_requests);
    }
  }
  return NextResponse.redirect(new URL('/admin/resources', req.url), 303);
}
