import { redirect } from 'next/navigation';
import { db } from '@/lib/supabase';
import { getContractor } from '@/lib/contractors';
import ContractorNav from '../ContractorNav';
import '../../contractor.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Team | TLGB' };

function Act({ action, fields, label }: { action: string; fields: Record<string, string>; label: string }) {
  return (
    <form method="post" action="/api/contractor/action">
      <input type="hidden" name="action" value={action} />
      <input type="hidden" name="back" value="/contractor/team" />
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button type="submit">{label}</button>
    </form>
  );
}

export default async function Team({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await getContractor();
  if (!me) redirect('/login?next=/contractor/team');
  const { error } = await searchParams;
  const { data: users } = await db().from('contractor_users').select('id, name, email, job_title, role, created_at').eq('company_id', me.company.id).is('removed_at', null).order('created_at');
  const owner = me.user.role === 'owner';

  return (
    <div className="ct-page">
      <ContractorNav me={me} on="team" />
      {error && <p className="err big">{error}</p>}
      <section className="ct-box">
        <h2>People on this account ({users?.length ?? 0} of {me.can.maxUsers})</h2>
        <p className="muted small">Everyone here shares the shortlist, notes and jobs. They log in with their own email; there are no passwords. Owners can add and remove people.</p>
        {(users ?? []).map((u) => (
          <div key={u.id} className="ct-row">
            <div className="grow">
              <strong>{u.name}</strong>{u.job_title ? `, ${u.job_title}` : ''} <span className={`ct-tag${u.role === 'owner' ? ' ok' : ''}`}>{u.role === 'owner' ? 'Owner' : 'Member'}</span>
              <div className="ct-meta">{u.email}</div>
            </div>
            {owner && u.id !== me.user.id && (
              <div className="ct-actions">
                <Act action="team-role" fields={{ user_id: u.id, role: u.role === 'owner' ? 'member' : 'owner' }} label={u.role === 'owner' ? 'Make member' : 'Make owner'} />
                <Act action="team-remove" fields={{ user_id: u.id }} label="Remove" />
              </div>
            )}
          </div>
        ))}
      </section>

      {owner ? (
        <section className="ct-box">
          <h2>Add someone</h2>
          <form method="post" action="/api/contractor/action" className="ct-inline">
            <input type="hidden" name="action" value="team-add" />
            <input type="hidden" name="back" value="/contractor/team" />
            <input name="name" required maxLength={120} placeholder="Name" />
            <input name="email" type="email" required maxLength={200} placeholder="Work email" />
            <input name="job_title" maxLength={80} placeholder="Job title (optional)" />
            <select name="role" defaultValue="member"><option value="member">Member</option><option value="owner">Owner</option></select>
            <button type="submit" className="ct-btn go">Add</button>
          </form>
          <p className="muted small">We email them to say they have been added. Only add people who work for {me.company.name}.</p>
        </section>
      ) : <p className="muted">Ask an owner on your account to add or remove people.</p>}
    </div>
  );
}
