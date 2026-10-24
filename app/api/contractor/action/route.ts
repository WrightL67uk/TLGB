import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { safeNext, sameOrigin } from '@/lib/session';
import { getContractor, ownJob, isUuid, matchingMembers, jobIsOpen, type Me, type Job } from '@/lib/contractors';
import { tradeLabel } from '@/lib/config';
import { valueBandLabel } from '@/lib/contractorPlans';
import { emailJobAlert, emailAdminNewJob, emailContractorUserAdded, type JobAlert } from '@/lib/email';
import { z } from 'zod';

export const runtime = 'nodejs';
export const maxDuration = 120;

// One endpoint for the small actions in the contractor area. Every form posts here with an
// "action" and a "back" path, and is sent back there (with ?error=... if something was wrong).

type Fd = FormData;
type Result = string | null; // an error message, or null when it worked

const str = (fd: Fd, k: string) => String(fd.get(k) ?? '').trim();

function alertFor(j: Job, company: string): JobAlert {
  return {
    id: j.id, title: j.title, company, town: j.town, postcode: j.postcode,
    trades: j.trades.map(tradeLabel).join(', '), value: valueBandLabel(j.value_band),
    returnDate: j.return_date, startDate: j.start_date,
  };
}

async function isFavourite(me: Me, businessId: string) {
  const { count } = await db().from('contractor_favourites').select('business_id', { count: 'exact', head: true }).eq('company_id', me.company.id).eq('business_id', businessId);
  return !!count;
}

async function ownList(me: Me, listId: string) {
  if (!isUuid(listId)) return false;
  const { count } = await db().from('contractor_lists').select('id', { count: 'exact', head: true }).eq('id', listId).eq('company_id', me.company.id);
  return !!count;
}

const ACTIONS: Record<string, (me: Me, fd: Fd) => Promise<Result>> = {
  // ---------------- Shortlist
  async 'fav-add'(me, fd) {
    const id = str(fd, 'business_id');
    if (!isUuid(id)) return 'That listing could not be found.';
    const { count } = await db().from('contractor_favourites').select('business_id', { count: 'exact', head: true }).eq('company_id', me.company.id);
    if ((count ?? 0) >= me.can.maxFavourites) return `Your plan allows ${me.can.maxFavourites} saved trades.`;
    const { data: b } = await db().from('businesses').select('id, status').eq('id', id).maybeSingle();
    if (!b || b.status !== 'approved') return 'That listing could not be found.';
    const { error } = await db().from('contractor_favourites').upsert({ company_id: me.company.id, business_id: id, added_by: me.user.name }, { onConflict: 'company_id,business_id', ignoreDuplicates: true });
    return error ? 'Could not save. Try again.' : null;
  },
  async 'fav-remove'(me, fd) {
    const id = str(fd, 'business_id');
    if (!isUuid(id)) return null;
    const { data: lists } = await db().from('contractor_lists').select('id').eq('company_id', me.company.id);
    if (lists?.length) await db().from('contractor_list_items').delete().eq('business_id', id).in('list_id', lists.map((l) => l.id));
    await db().from('contractor_favourites').delete().eq('company_id', me.company.id).eq('business_id', id);
    return null;
  },
  async 'alerts'(me, fd) {
    const on = str(fd, 'on') === '1';
    await db().from('contractor_users').update({ shortlist_alerts: on }).eq('id', me.user.id);
    return null;
  },
  async 'fav-note'(me, fd) {
    const id = str(fd, 'business_id');
    if (!isUuid(id)) return null;
    const note = str(fd, 'note').slice(0, 2000) || null;
    await db().from('contractor_favourites').update({ note, updated_at: new Date().toISOString() }).eq('company_id', me.company.id).eq('business_id', id);
    return null;
  },
  async 'list-create'(me, fd) {
    const name = str(fd, 'name').slice(0, 60);
    if (name.length < 2) return 'Give the list a name.';
    const { count } = await db().from('contractor_lists').select('id', { count: 'exact', head: true }).eq('company_id', me.company.id);
    if ((count ?? 0) >= me.can.maxLists) return `Your plan allows ${me.can.maxLists} lists.`;
    const { error } = await db().from('contractor_lists').insert({ company_id: me.company.id, name });
    if (error?.code === '23505') return 'You already have a list with that name.';
    return error ? 'Could not add the list.' : null;
  },
  async 'list-delete'(me, fd) {
    const id = str(fd, 'list_id');
    if (await ownList(me, id)) await db().from('contractor_lists').delete().eq('id', id);
    return null;
  },
  async 'list-add'(me, fd) {
    const list = str(fd, 'list_id');
    const biz = str(fd, 'business_id');
    if (!(await ownList(me, list)) || !isUuid(biz) || !(await isFavourite(me, biz))) return 'Choose a list.';
    await db().from('contractor_list_items').upsert({ list_id: list, business_id: biz }, { onConflict: 'list_id,business_id', ignoreDuplicates: true });
    return null;
  },
  async 'list-remove'(me, fd) {
    const list = str(fd, 'list_id');
    const biz = str(fd, 'business_id');
    if ((await ownList(me, list)) && isUuid(biz)) await db().from('contractor_list_items').delete().eq('list_id', list).eq('business_id', biz);
    return null;
  },

  // ---------------- Jobs
  async 'job-publish'(me, fd) {
    if (me.company.status !== 'approved') return 'You can send jobs once your company is approved.';
    if (!me.can.canPostJobs) return 'Your plan does not include posting jobs.';
    const job = await ownJob(me, str(fd, 'job_id'));
    if (!job || job.status !== 'draft') return 'That job has already been sent.';
    const { count } = await db().from('contractor_jobs').select('id', { count: 'exact', head: true }).eq('company_id', me.company.id).eq('status', 'open');
    if ((count ?? 0) >= me.can.maxLiveJobs) return `Your plan allows ${me.can.maxLiveJobs} open jobs. Close one first.`;

    const now = new Date().toISOString();
    const { data: claimed } = await db().from('contractor_jobs').update({ status: 'open', published_at: now, updated_at: now })
      .eq('id', job.id).eq('status', 'draft').select('id');
    if (!claimed?.length) return null; // a double click: already sent

    const matches = (await matchingMembers(job)).filter((b) => b.job_alerts);
    const alert = alertFor({ ...job, status: 'open' }, me.company.name);
    for (const b of matches.slice(0, 1000)) await emailJobAlert(b.email, b.contact_name, b.trading_name, alert, false);
    await db().from('contractor_jobs').update({ notified_count: matches.length }).eq('id', job.id);
    await emailAdminNewJob({ id: job.id, title: job.title, company: me.company.name, matched: matches.length });
    return null;
  },
  async 'job-close'(me, fd) {
    const job = await ownJob(me, str(fd, 'job_id'));
    if (job && job.status === 'open') await db().from('contractor_jobs').update({ status: 'closed', closed_reason: str(fd, 'reason').slice(0, 200) || null, updated_at: new Date().toISOString() }).eq('id', job.id);
    return null;
  },
  async 'job-reopen'(me, fd) {
    const job = await ownJob(me, str(fd, 'job_id'));
    if (!job || job.status !== 'closed') return null;
    if (job.return_date && job.return_date < new Date().toISOString().slice(0, 10)) return 'Change the reply-by date before reopening.';
    await db().from('contractor_jobs').update({ status: 'open', updated_at: new Date().toISOString() }).eq('id', job.id);
    return null;
  },
  async 'job-delete'(me, fd) {
    const job = await ownJob(me, str(fd, 'job_id'));
    if (!job || job.status !== 'draft') return 'Only drafts can be deleted. Close a sent job instead.';
    const { data: files } = await db().from('contractor_job_files').select('storage_path').eq('job_id', job.id);
    if (files?.length) await db().storage.from('contractor-jobs').remove(files.map((f) => f.storage_path));
    await db().from('contractor_jobs').delete().eq('id', job.id);
    return null;
  },
  async 'job-invite'(me, fd) {
    if (!me.can.canInvite) return 'Your plan does not include invitations.';
    const job = await ownJob(me, str(fd, 'job_id'));
    if (!job || !jobIsOpen(job)) return 'Send the job before inviting trades, and make sure it is still open.';
    const ids = fd.getAll('business_ids').map(String).filter(isUuid).slice(0, 100);
    if (!ids.length) return 'Tick at least one trade to invite.';
    const { data: favs } = await db().from('contractor_favourites').select('business_id').eq('company_id', me.company.id).in('business_id', ids);
    const ok = (favs ?? []).map((f) => f.business_id as string);
    const { data: already } = await db().from('contractor_job_invites').select('business_id').eq('job_id', job.id).in('business_id', ok);
    const fresh = ok.filter((id) => !already?.some((a) => a.business_id === id));
    if (!fresh.length) return 'Those trades have already been invited.';
    await db().from('contractor_job_invites').insert(fresh.map((business_id) => ({ job_id: job.id, business_id, invited_by: me.user.email })));
    const { data: biz } = await db().from('businesses').select('email, contact_name, trading_name, status').in('id', fresh);
    const alert = alertFor(job, me.company.name);
    for (const b of biz ?? []) if (b.status === 'approved') await emailJobAlert(b.email, b.contact_name, b.trading_name, alert, true);
    return null;
  },
  async 'reply-status'(me, fd) {
    const id = str(fd, 'reply_id');
    const status = str(fd, 'status');
    if (!isUuid(id) || !['new', 'shortlisted', 'declined'].includes(status)) return null;
    const { data: r } = await db().from('contractor_job_replies').select('id, job_id').eq('id', id).maybeSingle();
    if (!r || !(await ownJob(me, r.job_id))) return null;
    await db().from('contractor_job_replies').update({ status }).eq('id', id);
    return null;
  },
  async 'reply-note'(me, fd) {
    const id = str(fd, 'reply_id');
    if (!isUuid(id)) return null;
    const { data: r } = await db().from('contractor_job_replies').select('id, job_id').eq('id', id).maybeSingle();
    if (!r || !(await ownJob(me, r.job_id))) return null;
    await db().from('contractor_job_replies').update({ contractor_note: str(fd, 'note').slice(0, 2000) || null }).eq('id', id);
    return null;
  },

  // ---------------- Team
  async 'team-add'(me, fd) {
    if (me.user.role !== 'owner') return 'Only account owners can add people.';
    const parsed = z.object({
      email: z.string().trim().toLowerCase().email('Enter a valid email address'),
      name: z.string().trim().min(2, 'Enter their name').max(120),
      job_title: z.string().trim().max(80),
    }).safeParse({ email: str(fd, 'email'), name: str(fd, 'name'), job_title: str(fd, 'job_title') });
    if (!parsed.success) return parsed.error.issues[0].message;
    const d = parsed.data;
    const { count } = await db().from('contractor_users').select('id', { count: 'exact', head: true }).eq('company_id', me.company.id).is('removed_at', null);
    if ((count ?? 0) >= me.can.maxUsers) return `Your plan allows ${me.can.maxUsers} people.`;
    const [{ count: asTrade }, { count: asUser }] = await Promise.all([
      db().from('businesses').select('id', { count: 'exact', head: true }).eq('email', d.email).neq('status', 'draft'),
      db().from('contractor_users').select('id', { count: 'exact', head: true }).eq('email', d.email).is('removed_at', null),
    ]);
    if (asTrade) return 'That email is used for a trade listing, so it cannot join a contractor account.';
    if (asUser) return 'That email already belongs to a contractor account.';
    const { error } = await db().from('contractor_users').insert({
      company_id: me.company.id, email: d.email, name: d.name, job_title: d.job_title || null, role: str(fd, 'role') === 'owner' ? 'owner' : 'member', added_by: me.user.email,
    });
    if (error) return 'Could not add them. Try again.';
    await emailContractorUserAdded(d.email, d.name, me.company.name, me.user.name);
    return null;
  },
  async 'team-remove'(me, fd) {
    if (me.user.role !== 'owner') return 'Only account owners can remove people.';
    const id = str(fd, 'user_id');
    if (!isUuid(id)) return null;
    if (id === me.user.id) return 'You cannot remove yourself. Ask another owner.';
    await db().from('contractor_users').update({ removed_at: new Date().toISOString() }).eq('id', id).eq('company_id', me.company.id);
    return null;
  },
  async 'team-role'(me, fd) {
    if (me.user.role !== 'owner') return 'Only account owners can change roles.';
    const id = str(fd, 'user_id');
    const role = str(fd, 'role') === 'owner' ? 'owner' : 'member';
    if (!isUuid(id) || id === me.user.id) return null;
    await db().from('contractor_users').update({ role }).eq('id', id).eq('company_id', me.company.id);
    return null;
  },
};

export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const back = safeNext(fd?.get('back'), '/contractor');
  const go = (error?: string | null) => {
    const url = new URL(back, req.url);
    if (error) url.searchParams.set('error', error);
    return NextResponse.redirect(url, 303);
  };
  if (!sameOrigin(req) || !fd) return go('Please use the buttons on our website.');
  const me = await getContractor();
  if (!me) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(back)}`, req.url), 303);
  if (me.company.status === 'suspended') return go('This account is suspended.');
  const run = ACTIONS[String(fd.get('action') ?? '')];
  if (!run) return go('Unknown action.');
  try {
    return go(await run(me, fd));
  } catch (err) {
    console.error('contractor action failed', fd.get('action'), err);
    return go('Something went wrong. Please try again.');
  }
}
