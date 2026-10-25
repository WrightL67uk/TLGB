import Link from 'next/link';
import { db } from '@/lib/supabase';
import { getSessionEmail } from '@/lib/session';
import { employerAccess, seekerName, type Seeker } from '@/lib/seekers';
import { LEVELS, SKILL_GROUPS, VEHICLE, label, skillLabel, payText, availableNow } from '@/lib/seekerTypes';
import { QUAL_TYPES, qualLabel } from '@/lib/teamTypes';
import { lookupPostcode } from '@/lib/postcodes';
import { miles } from '@/lib/resources';
import { ukDate } from '@/lib/complianceTypes';
import '../workers.css';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'People looking for landscaping work | The Little Green Book',
  description: 'Landscapers, grounds maintenance staff, groundworkers, machine operators and supervisors looking for work, with their skills, cards and availability.',
};

type SP = Promise<{ skill?: string; level?: string; card?: string; postcode?: string; now?: string; van?: string }>;

const today = () => new Date().toISOString().slice(0, 10);

export default async function WorkersBoard({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const email = await getSessionEmail();
  const access = await employerAccess(email);

  const { data } = await db().from('job_seekers').select('*').eq('status', 'live').gt('expires_at', new Date().toISOString())
    .order('published_at', { ascending: false }).limit(1000);
  let rows = ((data ?? []) as Seeker[]).filter((s) => !s.available_until || s.available_until >= today());

  if (sp.skill) rows = rows.filter((s) => s.skills.includes(sp.skill!));
  if (sp.level) rows = rows.filter((s) => s.level === sp.level);
  if (sp.card) rows = rows.filter((s) => s.cards.includes(sp.card!));
  if (sp.now === '1') rows = rows.filter(availableNow);
  if (sp.van === '1') rows = rows.filter((s) => s.vehicle === 'own' || s.vehicle === 'own_van');

  let where: { lat: number; lng: number; postcode: string } | null = null;
  let pcError = '';
  if (sp.postcode?.trim()) {
    const pc = await lookupPostcode(sp.postcode);
    if (pc.ok) where = pc; else pcError = pc.reason;
  }
  const withDist = rows.map((s) => ({ s, d: where && s.lat != null && s.lng != null ? miles(where.lat, where.lng, s.lat, s.lng) : null }));
  const shown = where
    ? withDist.filter((x) => x.d != null && (x.d <= Math.max(x.s.travel_miles, 5) || x.s.stay_away)).sort((a, b) => a.d! - b.d!)
    : withDist;

  return (
    <div>
      <div className="leads-head">
        <h1>People looking for work</h1>
        <p className="lead">Landscapers, grounds maintenance staff, groundworkers, machine operators and supervisors who have posted a free profile.{' '}
          {access.ok ? 'You can see their names and contact details.' : 'Paying members and checked main contractors can see their names and contact details.'}</p>
      </div>

      {!access.ok && (
        <p className="panel small">
          {access.who === 'unpaid' ? <>Start your membership to see names and contact details. <Link href="/account">Go to my listing</Link>.</>
            : <>Hiring? <Link href="/login?next=/workers">Log in</Link> as a member or contractor, <Link href="/join">list your business</Link> or <Link href="/contractors/join">create a free contractor account</Link>.</>}
          {' '}Looking for work yourself? <Link href="/looking-for-work">Post a free profile</Link>.
        </p>
      )}

      <form method="get" className="wk-filters">
        <label>Skill
          <select name="skill" defaultValue={sp.skill ?? ''}>
            <option value="">Any skill</option>
            {SKILL_GROUPS.map((g) => <optgroup key={g.group} label={g.group}>{g.items.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}</optgroup>)}
          </select>
        </label>
        <label>Role
          <select name="level" defaultValue={sp.level ?? ''}>
            <option value="">Any role</option>
            {LEVELS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </label>
        <label>Card or ticket
          <select name="card" defaultValue={sp.card ?? ''}>
            <option value="">Any</option>
            {QUAL_TYPES.filter((q) => q.key !== 'other' && q.key !== 'qualification').map((q) => <option key={q.key} value={q.key}>{q.label}</option>)}
          </select>
        </label>
        <label>Near postcode<input name="postcode" defaultValue={sp.postcode ?? ''} placeholder="e.g. SG5 1AA" style={{ minWidth: 120, width: 130 }} /></label>
        <label className="chk"><input type="checkbox" name="now" value="1" defaultChecked={sp.now === '1'} /> Available now</label>
        <label className="chk"><input type="checkbox" name="van" value="1" defaultChecked={sp.van === '1'} /> Own vehicle</label>
        <button type="submit" className="wk-btn go">Search</button>
        {(sp.skill || sp.level || sp.card || sp.postcode || sp.now || sp.van) && <Link href="/workers" className="small" style={{ paddingBottom: 10 }}>Clear</Link>}
      </form>
      {pcError && <p className="err big">{pcError}</p>}

      <p className="muted small">{shown.length} {shown.length === 1 ? 'person' : 'people'}{where ? ` who will travel to ${where.postcode}` : ''}.</p>

      {!shown.length && (
        <p className="panel">No profiles match yet. {rows.length ? 'Try fewer filters.' : 'Job seeker profiles are new, so check back soon.'}</p>
      )}

      <div className="wk-list">
        {shown.map(({ s, d }) => {
          const pay = payText(s);
          return (
            <Link key={s.id} href={`/workers/${s.id}`} className="wk-card">
              <h2>{s.headline}</h2>
              <div className="wk-meta">
                {access.ok && <b>{seekerName(s)}</b>}
                {s.level && <span>{label(LEVELS, s.level)}</span>}
                {s.years_experience != null && <span>{s.years_experience} year{s.years_experience === 1 ? '' : 's'} in the trade</span>}
                <span>{s.area ?? 'UK'}{d != null ? `, ${Math.round(d)} miles away` : ''}, travels {s.travel_miles} miles{s.stay_away ? ', will stay away' : ''}</span>
              </div>
              <div className="wk-meta">
                <span>{availableNow(s) ? 'Available now' : `Available from ${ukDate(s.available_from)}`}{s.available_until ? ` until ${ukDate(s.available_until)}` : ''}</span>
                {pay && <span>{pay}</span>}
                {s.vehicle && <span>{label(VEHICLE, s.vehicle)}</span>}
                {s.team_size > 1 && <span>Team of {s.team_size}</span>}
              </div>
              <div className="wk-tags">
                {availableNow(s) && <span className="wk-tag now">Available now</span>}
                {s.skills.slice(0, 6).map((k) => <span key={k} className="wk-tag">{skillLabel(k)}</span>)}
                {s.skills.length > 6 && <span className="wk-tag">+{s.skills.length - 6} more</span>}
                {s.cards.slice(0, 4).map((k) => <span key={k} className="wk-tag card">{qualLabel(k)}</span>)}
              </div>
            </Link>
          );
        })}
      </div>
      <p className="muted small" style={{ marginTop: 18 }}>Profiles are written by the job seekers themselves. We do not check their skills, cards or right to work, so make your usual checks before taking anyone on.</p>
    </div>
  );
}
