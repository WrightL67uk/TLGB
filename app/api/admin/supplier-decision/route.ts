import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { stripe, stripeEnabled } from '@/lib/stripe';
import { emailSupplierLive, emailSupplierRejected, emailAdminSupplier } from '@/lib/email';
import { freeSlug, isSubscribed } from '@/lib/supplierAccount';

export const runtime = 'nodejs';

// Behind the admin login (middleware). Approve or reject a supplier that has paid and sent its details.
const back = (req: NextRequest, q = '') => NextResponse.redirect(new URL(`/admin/resources${q}#suppliers`, req.url), 303);

export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const id = String(fd?.get('id') ?? '');
  const action = String(fd?.get('action') ?? '');
  const reason = String(fd?.get('reason') ?? '').trim();
  if (!fd || !/^[0-9a-f-]{36}$/i.test(id)) return back(req);
  const { data: s } = await db().from('suppliers').select('id, name, email, status, tier, slug, subscription_status, stripe_subscription_id').eq('id', id).maybeSingle();
  if (!s) return back(req);
  const now = new Date().toISOString();

  if (action === 'approve') {
    if (!['pending', 'rejected'].includes(s.status)) return back(req, '?supplier_error=' + encodeURIComponent('Only suppliers waiting for a check can be approved.'));
    if (s.tier && !isSubscribed(s)) return back(req, '?supplier_error=' + encodeURIComponent(`${s.name} has not paid, so cannot be approved yet.`));
    const slug = s.slug || (await freeSlug(s.name, s.id));
    await db().from('suppliers').update({ status: 'approved', slug, rejection_reason: null, reviewed_at: now }).eq('id', id);
    if (s.email) await emailSupplierLive(s.email, s.name, slug).catch(() => null);
  } else if (action === 'reject') {
    if (s.status !== 'pending') return back(req, '?supplier_error=' + encodeURIComponent('Only suppliers waiting for a check can be rejected.'));
    if (!reason) return back(req, '?supplier_error=' + encodeURIComponent('Give a reason: it goes to the supplier in the email.'));
    await db().from('suppliers').update({ status: 'rejected', rejection_reason: reason, reviewed_at: now, quote_requests: false }).eq('id', id);
    // Stop the plan so it does not renew. The refund itself is done in Stripe (one click on the payment).
    let note = '';
    if (s.stripe_subscription_id && isSubscribed(s) && stripeEnabled()) {
      try {
        await stripe('DELETE', `subscriptions/${s.stripe_subscription_id}`);
        note = ' Their plan has been cancelled so it will not renew. Please refund their payment in Stripe.';
      } catch (e) {
        console.error('cancel supplier plan on reject failed', e);
        note = ' We could not cancel their plan automatically: cancel and refund it in Stripe.';
      }
    }
    if (s.email) await emailSupplierRejected(s.email, s.name, reason).catch(() => null);
    await emailAdminSupplier(`Supplier rejected: ${s.name}`, `You rejected ${s.name}.${note}`, s.id).catch(() => null);
  }
  return back(req);
}
