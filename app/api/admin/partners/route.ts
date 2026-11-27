import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { freshPartnerCode } from '@/lib/partners';

export const runtime = 'nodejs';

// Behind the admin login (middleware). Add a partner, change their rates, switch them off,
// pay out what they have earned, or take one commission back.
const back = (req: NextRequest, q: string) => NextResponse.redirect(new URL(`/admin/partners?${q}`, req.url), 303);
const msg = (s: string) => 'msg=' + encodeURIComponent(s);
const err = (s: string) => 'error=' + encodeURIComponent(s);
const isId = (v: string) => /^[0-9a-f-]{36}$/i.test(v);
const pence = (v: FormDataEntryValue | null) => Math.round(Number(v) * 100);

export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  if (!fd) return back(req, err('Nothing was sent.'));
  const action = String(fd.get('action') ?? '');

  if (action === 'create') {
    const name = String(fd.get('name') ?? '').trim().slice(0, 120);
    const email = String(fd.get('email') ?? '').trim().toLowerCase().slice(0, 200);
    const kind = String(fd.get('kind') ?? '').trim().slice(0, 60) || null;
    const monthly = pence(fd.get('monthly'));
    const yearly = pence(fd.get('yearly'));
    if (name.length < 2) return back(req, err('Enter the partner name.'));
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return back(req, err('Enter a valid email address.'));
    if (!(monthly >= 0) || !(yearly >= 0)) return back(req, err('Enter the commission amounts in pounds.'));
    const wanted = String(fd.get('code') ?? '').trim();
    const code = await freshPartnerCode(name, wanted || undefined);
    if (!code) return back(req, err(wanted ? `${wanted.toUpperCase()} is already used by a partner or a discount code. Pick another.` : 'Could not make a code. Type one in.'));
    const { error } = await db().from('partners').insert({
      name, email, kind, code, monthly_pence: monthly, yearly_pence: yearly,
      note: String(fd.get('note') ?? '').trim().slice(0, 300) || null,
    });
    if (error) return back(req, err('Could not save the partner.'));
    return back(req, msg(`${name} added. Their link is /p/${code}.`));
  }

  if (action === 'paid') {
    const id = String(fd.get('id') ?? '');
    if (!isId(id)) return back(req, err('Partner not found.'));
    const { data, error } = await db().from('partner_commissions')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('partner_id', id).eq('status', 'earned').select('amount_pence');
    if (error) return back(req, err('Could not mark them paid.'));
    const total = (data ?? []).reduce((s, r) => s + r.amount_pence, 0);
    return back(req, msg(`Marked ${data?.length ?? 0} commission${data?.length === 1 ? '' : 's'} paid (£${(total / 100).toFixed(2)}).`));
  }

  if (action === 'reverse') {
    const id = String(fd.get('commission') ?? '');
    if (!isId(id)) return back(req, err('Commission not found.'));
    const note = String(fd.get('note') ?? '').trim().slice(0, 200) || 'Taken off by admin';
    const { data } = await db().from('partner_commissions').update({ status: 'reversed', note }).eq('id', id).eq('status', 'earned').select('id');
    return back(req, data?.length ? msg('Commission reversed.') : err('Only unpaid commission can be reversed.'));
  }

  const id = String(fd.get('id') ?? '');
  if (!isId(id)) return back(req, err('Partner not found.'));

  if (action === 'rates') {
    const monthly = pence(fd.get('monthly'));
    const yearly = pence(fd.get('yearly'));
    if (!(monthly >= 0) || !(yearly >= 0)) return back(req, err('Enter the commission amounts in pounds.'));
    await db().from('partners').update({ monthly_pence: monthly, yearly_pence: yearly }).eq('id', id);
    return back(req, msg('Rates saved. They apply to payments from now on.'));
  }
  if (action === 'suspend' || action === 'activate') {
    await db().from('partners').update({ status: action === 'suspend' ? 'suspended' : 'approved' }).eq('id', id);
    return back(req, msg(action === 'suspend' ? 'Partner switched off. Their link stops tracking and no new commission is earned.' : 'Partner switched on.'));
  }
  return back(req, err('Unknown action.'));
}
