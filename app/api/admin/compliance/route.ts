import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { archiveDocs } from '@/lib/compliance';
import { docType } from '@/lib/complianceTypes';
import { emailComplianceChecked } from '@/lib/email';

export const runtime = 'nodejs';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function actorFrom(req: NextRequest) {
  const h = req.headers.get('authorization') ?? '';
  try { return atob(h.replace(/^Basic /, '')).split(':')[0] || 'admin'; } catch { return 'admin'; }
}

/**
 * Admin checks a compliance pack certificate (insurance or accreditation).
 * Checking makes it visible to contractors and retires the version it replaces.
 * Behind the admin password (middleware).
 */
export async function POST(req: NextRequest) {
  const fd = await req.formData();
  const docId = String(fd.get('doc_id') ?? '');
  const action = String(fd.get('action') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(docId)) return new NextResponse('Bad id', { status: 400 });

  const { data: doc } = await db().from('compliance_docs').select('*').eq('id', docId).maybeSingle();
  if (!doc) return new NextResponse('Not found', { status: 404 });
  const back = (msg?: string) =>
    NextResponse.redirect(new URL(`/admin/${doc.business_id}${msg ? `?error=${encodeURIComponent(msg)}` : '?done=1'}#pack`, req.url), 303);
  if (doc.archived_at) return back('That document has already been replaced or deleted.');

  const { data: b } = await db().from('businesses').select('id, email, contact_name, trading_name, pl_expiry, el_expiry').eq('id', doc.business_id).maybeSingle();
  if (!b) return back('Listing not found.');

  if (action === 'check') {
    const expiry = String(fd.get('expiry') ?? '').trim();
    if (!DATE.test(expiry)) return back('Enter the expiry date shown on the certificate.');
    const title = String(fd.get('title') ?? '').trim().slice(0, 120) || doc.title;
    await db().from('compliance_docs').update({
      status: 'checked', expiry, title, reject_reason: null,
      checked_at: new Date().toISOString(), checked_by: actorFrom(req),
    }).eq('id', doc.id);
    if (doc.replaces) await archiveDocs([doc.replaces]);

    // A checked insurance certificate with a later date also moves the listing's confirmed date on
    const field = doc.doc_type === 'pl' ? 'pl_expiry' : doc.doc_type === 'el' ? 'el_expiry' : null;
    if (field && (!b[field] || expiry > b[field])) {
      await db().from('businesses').update({ [field]: expiry }).eq('id', b.id);
    }
    await emailComplianceChecked({ email: b.email, contactName: b.contact_name, tradingName: b.trading_name, businessId: b.id }, title, true);
    return back();
  }

  if (action === 'reject') {
    const reason = String(fd.get('reason') ?? '').trim().slice(0, 300);
    if (!reason) return back('Say why the document was not accepted, so the member can fix it.');
    await db().from('compliance_docs').update({ status: 'rejected', reject_reason: reason, checked_at: new Date().toISOString(), checked_by: actorFrom(req) }).eq('id', doc.id);
    await emailComplianceChecked({ email: b.email, contactName: b.contact_name, tradingName: b.trading_name, businessId: b.id }, doc.title, false, reason);
    return back();
  }

  return back(`Unknown action for ${docType(doc.doc_type)?.label ?? 'document'}.`);
}
