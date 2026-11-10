import Link from 'next/link';
import { db } from '@/lib/supabase';
import { getSessionEmail } from '@/lib/session';
import { employerAccess, seekerName, type Seeker } from '@/lib/seekers';
import { LEVELS, SKILL_GROUPS, VEHICLE, label, skillLabel, payText, availableNow } from '@/lib/seekerTypes';
import { QUAL_TYPES, qualLabel } from '@/lib/teamTypes';
import { lookupPostcode } from '@/lib/postcodes';
import { miles } from '@/lib/resources';
import { ukDate } from '@/lib/complianceTypes';
import { vacancyLive, type Vacancy } from '@/lib/vacancies';
import { describeAlert } from '@/lib/recruitJob';
import { isPaid } from '@/lib/membership';
import { WORK_TYPES, PAY_PERIODS } from '@/lib/seekerTypes';
import '../workers.css';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Recruitment: landscaping jobs and people looking for work | The Little Green Book',
  description: 'Landscaping and external works vacancies, free to browse, and landscapers, grounds maintenance staff, groundworkers and machine operators looking for work.',
};

type SP = Promise<{ tab?: string; work?: string; within?: string; alert_on?: string; alert_off?: string; alert_error?: string; skill?: string; level?: string; card?: string; postcode?: string; now?: string; van?: string }>;

const today = () => new Date().toISOString().slice(0, 10);

type VacRow = Vacancy & { businesses: { trading_name: string } | null };
const RADII = [10, 20, 30, 50, 100];

export default async function RecruitmentPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const tab = sp.tab === 'people' ? 'people' : 'vacancies';
  const email = await getSessionEmail();
  const access = await employerAccess(email);
  const { data: myBiz } = email
    ? await db().from('businesses').select('id, status, founding_member, subscription_status').eq('email', email).eq('status', 'approved')
    : { data: null };
  const member = (myBiz ?? []).find(isPaid) ?? null;
  const { data: meSeeker } = email ? await db().from('job_seekers').select('id').eq('email', email).neq('status', 'removed').maybeSingle() : { data: null };

  let where: { lat: number; lng: number; postcode: string } | null = null;
  let pcError = '';
  if (sp.postcode?.trim()) {
    const pc = await lookupPostcode(sp.postcode);
    if (pc.ok) where = pc; else pcError = pc.reason;
  }

  // Vacancies: public, no login needed
  const { data: vData } = await db().from('vacancies').select('*, businesses(trading_name)').eq('status', 'live').gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false }).limit(1000);
  let vacs = ((vData ?? []) as VacRow[]).filter(vacancyLive);
  const vacTotal = vacs.length;
  if (tab === 'vacancies') {
    if (sp.level) vacs = vacs.filter((v) => !v.level || v.level === sp.level);
    if (sp.work) vacs = vacs.filter((v) => !v.work_types.length || v.work_types.includes(sp.work!));
  }
  const radius = RADII.includes(Number(sp.within)) ? Number(sp.within) : 30;
  const vacShown = vacs
    .map((v) => ({ v, d: where && v.lat != null && v.lng != null ? miles(where.lat, where.lng, v.lat, v.lng) : null }))
    .filter((x) => tab !== 'vacancies' || !where || (x.d != null && x.d <= radius))
    .sort((a, b) => (where && a.d != null && b.d != null ? a.d - b.d : 0));

  // People looking for work
  const { data } = await db().from('job_seekers').select('*').eq('status', 'live').gt('expires_at', new Date().toISOString())
    .order('published_at', { ascending: false }).limit(1000);
  let rows = ((data ?? []) as Seeker[]).filter((s) => !s.available_until || s.available_until >= today());
  const peopleTotal = rows.length;
  if (tab === 'people') {
    if (sp.skill) rows = rows.filter((s) => s.skills.includes(sp.skill!));
    if (sp.level) rows = rows.filter((s) => s.level === sp.level);
    if (sp.card) rows = rows.filter((s) => s.cards.includes(sp.card!));
    if (sp.now === '1') rows = rows.filter(availableNow);
    if (sp.van === '1') rows = rows.filter((s) => s.vehicle === 'own' || s.vehicle === 'own_van');
  }
  const withDist = rows.map((s) => ({ s, d: where && s.lat != null && s.lng != null ? miles(where.lat, where.lng, s.lat, s.lng) : null }));
  const shown = where && tab === 'people'
    ? withDist.filter((x) => x.d != null && (x.d <= Math.max(x.s.travel_miles, 5) || x.s.stay_away)).sort((a, b) => a.d! - b.d!)
    : withDist;

  const { data: myAlerts } = access.ok && email ? await db().from('recruit_alerts').select('*').eq('email', email).order('created_at') : { data: null };
  const filtered = !!(sp.skill || sp.level || sp.card || sp.postcode || sp.now || sp.van || sp.work || sp.within);

  return (
    <div>
      <div className="wk-hero">
        <h1>Recruitment</h1>
        <p>Jobs in landscaping and external works, and the people looking for them.</p>
      </div>

      <div className="rc-paths">
        <div>
          <p className="tender-tag">Looking for work?</p>
          <h2>Free for job seekers</h2>
          <p>Browse the vacancies below, no login needed. Post a free profile so employers can find you, and we will email you new vacancies that match.</p>
          <Link href={meSeeker ? '/seeker' : '/looking-for-work'} className="wk-btn go">{meSeeker ? 'My profile' : 'Post a free profile'}</Link>
        </div>
        <div>
          <p className="tender-tag">Hiring?</p>
          <h2>For verified members</h2>
          <p>Post vacancies (5 included with membership) and search people looking for work. Save a search and we email you when someone new matches.</p>
          {member
            ? <Link href={`/account/${member.id}/vacancies`} className="wk-btn go">Post a vacancy</Link>
            : <Link href="/join" className="wk-btn go">Become a member</Link>}
        </div>
      </div>

      <nav className="rc-tabs">
        <Link href="/recruitment" className={tab === 'vacancies' ? 'on' : ''}>Vacancies <span>{vacTotal}</span></Link>
        <Link href="/recruitment?tab=people" className={tab === 'people' ? 'on' : ''}>People looking for work <span>{peopleTotal}</span></Link>
      </nav>

      {tab === 'vacancies' ? (
        <>
          <form method="get" className="wk-filters">
            <label>Role
              <select name="level" defaultValue={sp.level ?? ''}>
                <option value="">Any role</option>
                {LEVELS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </label>
            <label>Type of work
              <select name="work" defaultValue={sp.work ?? ''}>
                <option value="">Any</option>
                {WORK_TYPES.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </label>
            <label>Near postcode<input name="postcode" defaultValue={sp.postcode ?? ''} placeholder="e.g. SG5 1AA" style={{ minWidth: 120, width: 130 }} /></label>
            <label>Within
              <select name="within" defaultValue={String(radius)}>
                {RADII.map((r) => <option key={r} value={r}>{r} miles</option>)}
              </select>
            </label>
            <button type="submit" className="wk-btn go">Search</button>
            {filtered && <Link href="/recruitment" className="small" style={{ paddingBottom: 10 }}>Clear</Link>}
          </form>
          {pcError && <p className="err big">{pcError}</p>}
          <p className="muted small">{vacShown.length} {vacShown.length === 1 ? 'vacancy' : 'vacancies'}{where ? ` within ${radius} miles of ${where.postcode}` : ''}.</p>
          {!vacShown.length && <p className="panel">{vacTotal ? 'No vacancies match. Try fewer filters or a wider distance.' : 'No vacancies yet. Post a free profile and we will email you when one that suits you goes up.'}</p>}
          <div className="wk-list">
            {vacShown.map(({ v, d }) => {
              const pay = payText(v);
              return (
                <Link key={v.id} href={`/recruitment/vacancies/${v.id}`} className="wk-card">
                  <h2>{v.title}</h2>
                  <div className="wk-meta">
                    <b>{v.businesses?.trading_name ?? 'TLGB member'}</b>
                    <span>{v.area}{d != null ? `, ${Math.round(d)} miles away` : ''}</span>
                    {pay && <span>{pay}</span>}
                    {v.level && <span>{label(LEVELS, v.level)}</span>}
                    <span>{v.start_date && v.start_date > today() ? `Starts ${ukDate(v.start_date)}` : 'Start as soon as possible'}</span>
                  </div>
                  <div className="wk-tags">
                    {v.work_types.map((k) => <span key={k} className="wk-tag now">{label(WORK_TYPES, k)}</span>)}
                    {v.skills.slice(0, 6).map((k) => <span key={k} className="wk-tag">{skillLabel(k)}</span>)}
                    {v.cards.slice(0, 4).map((k) => <span key={k} className="wk-tag card">{qualLabel(k)}</span>)}
                    {v.own_vehicle && <span className="wk-tag card">Own vehicle needed</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <p className="muted">{access.ok ? 'You can see names and contact details.' : 'Anyone can browse. Paying members and checked main contractors see names and contact details.'}</p>
          {!access.ok && (
            <p className="panel small">
              {access.who === 'unpaid' ? <>Start your membership to see names and contact details. <Link href="/account">Go to my listing</Link>.</>
                : <>Hiring? <Link href="/login?next=/recruitment?tab=people">Log in</Link> as a member or contractor, <Link href="/join">become a member</Link> or <Link href="/contractors/join">create a free contractor account</Link>.</>}
            </p>
          )}
          <form method="get" className="wk-filters">
            <input type="hidden" name="tab" value="people" />
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
            {filtered && <Link href="/recruitment?tab=people" className="small" style={{ paddingBottom: 10 }}>Clear</Link>}
          </form>
          {pcError && <p className="err big">{pcError}</p>}

          <div className="rc-alerts" id="alerts">
            {sp.alert_on && <p className="ok-box">Alert saved. We will email you each morning when someone new matches.</p>}
            {sp.alert_off && <p className="ok-box">Alert turned off.</p>}
            {sp.alert_error && <p className="err">{sp.alert_error.slice(0, 200)}</p>}
            {access.ok ? (
              <>
                <form method="post" action="/api/recruit-alerts" className="rc-alert-form">
                  {(['skill', 'level', 'card', 'postcode', 'now', 'van'] as const).map((k) => sp[k] ? <input key={k} type="hidden" name={k} value={sp[k]} /> : null)}
                  <span><strong>Email me when someone new matches {filtered ? 'this search' : 'any search'}</strong>{filtered ? '' : '. Set the filters above first to narrow it down.'}</span>
                  <button type="submit" className="wk-btn">Save as email alert</button>
                </form>
                {(myAlerts ?? []).length > 0 && (
                  <ul className="rc-alert-list">
                    {(myAlerts ?? []).map((a) => (
                      <li key={a.id}>
                        <span>{describeAlert(a)}</span>
                        <form method="post" action="/api/recruit-alerts" style={{ margin: 0 }}>
                          <input type="hidden" name="action" value="remove" /><input type="hidden" name="id" value={a.id} />
                          <button type="submit" className="linkish small">remove</button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="muted small" style={{ margin: 0 }}>Members can save a search and get an email when someone new matches.</p>
            )}
          </div>

          <p className="muted small">{shown.length} {shown.length === 1 ? 'person' : 'people'}{where ? ` who will travel to ${where.postcode}` : ''}.</p>
          {!shown.length && (
            <p className="panel">No profiles match yet. {rows.length ? 'Try fewer filters.' : 'Job seeker profiles are new, so check back soon, or save an alert.'}</p>
          )}
      <div className="wk-list">
        {shown.map(({ s, d }) => {
          const pay = payText(s);
          return (
            <Link key={s.id} href={`/recruitment/${s.id}`} className="wk-card">
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
        </>
      )}
    </div>
  );
}
