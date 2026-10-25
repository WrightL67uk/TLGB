import Link from 'next/link';
import type { Metadata } from 'next';
import { db } from '@/lib/supabase';
import { getSessionEmail } from '@/lib/session';
import { employerAccess, seekerLive, seekerName, type Seeker } from '@/lib/seekers';
import { LEVELS, LICENCES, VEHICLE, TOOLS, WORK_TYPES, SKILL_GROUPS, label, payText, availableNow } from '@/lib/seekerTypes';
import { qualLabel } from '@/lib/teamTypes';
import { ukDate } from '@/lib/complianceTypes';
import '../../workers.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Job seeker profile | The Little Green Book', robots: { index: false, follow: false } };

const isId = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

export default async function WorkerProfile({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ reported?: string; error?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { data } = isId(id) ? await db().from('job_seekers').select('*').eq('id', id).maybeSingle() : { data: null };
  const s = data as Seeker | null;
  const email = await getSessionEmail();
  const own = !!s && s.email === email;

  if (!s || (!seekerLive(s) && !own)) {
    return (
      <div className="narrow">
        <h1>This profile is not available</h1>
        <p className="lead">The person may have found work, paused their profile or taken it down.</p>
        <p><Link href="/workers">See everyone looking for work</Link></p>
      </div>
    );
  }

  const access = await employerAccess(email);
  const canSee = access.ok || own;
  if (access.ok && !own) await db().from('job_seekers').update({ view_count: s.view_count + 1 }).eq('id', s.id);

  const pay = payText(s);
  const skillsByGroup = SKILL_GROUPS.map((g) => ({ group: g.group, items: g.items.filter((o) => s.skills.includes(o.key)) })).filter((g) => g.items.length);
  const workTypes = s.work_types.map((k) => label(WORK_TYPES, k)).filter(Boolean);
  const licences = s.licences.map((k) => label(LICENCES, k)).filter(Boolean);

  return (
    <div>
      <p className="small"><Link href="/workers">All people looking for work</Link></p>
      {own && !seekerLive(s) && <p className="ok-box">This is a preview. Your profile is not on the board at the moment. <Link href="/seeker">Go to my profile</Link></p>}
      {own && seekerLive(s) && <p className="ok-box">This is how employers see your profile. <Link href="/seeker">Edit it</Link></p>}
      <h1>{canSee ? seekerName(s) : (label(LEVELS, s.level) ?? 'Job seeker')}</h1>
      <p className="lead" style={{ marginBottom: 16 }}>{s.headline}</p>
      {sp.reported && <p className="ok-box">Thanks. We will look at this profile.</p>}
      {sp.error && <p className="err big">{sp.error}</p>}

      <div className="wk-profile">
        <div>
          {s.about && <section><h2>About</h2><p>{s.about}</p></section>}

          {(skillsByGroup.length > 0 || s.other_skills) && (
            <section>
              <h2>Skills</h2>
              {skillsByGroup.map((g) => (
                <div key={g.group} style={{ marginBottom: 8 }}>
                  <div className="wk-sub" style={{ margin: '4px 0' }}>{g.group}</div>
                  <div className="wk-tags" style={{ marginTop: 0 }}>{g.items.map((o) => <span key={o.key} className="wk-tag">{o.label}</span>)}</div>
                </div>
              ))}
              {s.other_skills && <p style={{ marginTop: 8 }}>{s.other_skills}</p>}
            </section>
          )}

          {(s.cards.length > 0 || s.other_cards || licences.length > 0) && (
            <section>
              <h2>Cards, tickets and licences</h2>
              <div className="wk-tags" style={{ marginTop: 0 }}>
                {s.cards.map((k) => <span key={k} className="wk-tag card">{qualLabel(k)}</span>)}
                {licences.map((l) => <span key={l} className="wk-tag card">Driving: {l}</span>)}
              </div>
              {s.other_cards && <p style={{ marginTop: 8 }}>{s.other_cards}</p>}
            </section>
          )}

          {s.past_employers && <section><h2>Previous employers</h2><p>{s.past_employers}</p></section>}
        </div>

        <aside>
          {canSee ? (
            <section className="wk-contact">
              <h2>Contact</h2>
              <ul className="wk-facts">
                {s.show_email && <li><span>Email</span><a href={`mailto:${s.email}?subject=${encodeURIComponent('Your profile on The Little Green Book')}`}>{s.email}</a></li>}
                {s.show_phone && s.phone && <li><span>Phone</span><a href={`tel:${s.phone.replace(/\s/g, '')}`}>{s.phone}</a></li>}
              </ul>
              <p className="small muted" style={{ marginTop: 10, marginBottom: 0 }}>Please only contact them about work.</p>
            </section>
          ) : (
            <section className="wk-locked">
              <h2>Contact details</h2>
              <p className="small" style={{ marginBottom: 0 }}>
                {access.who === 'unpaid'
                  ? <>Names and contact details are included with membership. <Link href="/account">Start your membership</Link>.</>
                  : <>Shown to paying members and checked main contractors. <Link href={`/login?next=/workers/${s.id}`}>Log in</Link>, <Link href="/join">list your business</Link> or <Link href="/contractors/join">create a free contractor account</Link>.</>}
              </p>
            </section>
          )}

          <section>
            <h2>At a glance</h2>
            <ul className="wk-facts">
              {s.level && <li><span>Role</span>{label(LEVELS, s.level)}</li>}
              {s.years_experience != null && <li><span>Experience</span>{s.years_experience} year{s.years_experience === 1 ? '' : 's'}</li>}
              <li><span>Based</span>{s.area ?? 'UK'}, travels up to {s.travel_miles} miles{s.stay_away ? '. Happy to stay away' : ''}</li>
              <li><span>Available</span>{availableNow(s) ? 'Now' : `From ${ukDate(s.available_from)}`}{s.available_until ? ` until ${ukDate(s.available_until)}` : ''}</li>
              {pay && <li><span>Pay expected</span>{pay}</li>}
              {workTypes.length > 0 && <li><span>Looking for</span>{workTypes.join(', ')}</li>}
              {s.vehicle && <li><span>Vehicle</span>{label(VEHICLE, s.vehicle)}</li>}
              {s.tools && <li><span>Tools</span>{label(TOOLS, s.tools)}</li>}
              {s.team_size > 1 && <li><span>Team</span>{s.team_size} people available</li>}
              <li><span>Profile updated</span>{ukDate(s.updated_at)}</li>
            </ul>
          </section>

          {email && !own && (
            <details className="panel small">
              <summary>Report this profile</summary>
              <form method="post" action="/api/workers/report" style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                <input type="hidden" name="id" value={s.id} />
                <textarea name="reason" required minLength={5} maxLength={1000} placeholder="What is wrong with it?" style={{ font: 'inherit', padding: 8 }} />
                <button type="submit">Send report</button>
              </form>
            </details>
          )}
        </aside>
      </div>
      <p className="muted small">Written by the job seeker. We do not check skills, cards or right to work, so make your usual checks before taking anyone on.</p>
    </div>
  );
}
