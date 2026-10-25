import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionEmail } from '@/lib/session';
import { seekerByEmail, seekerLive } from '@/lib/seekers';
import { LEVELS, SKILL_GROUPS, LICENCES, VEHICLE, TOOLS, WORK_TYPES, PAY_PERIODS, SEEKER_LIVE_DAYS, type Opt } from '@/lib/seekerTypes';
import { QUAL_TYPES, QUAL_GROUPS } from '@/lib/teamTypes';
import { ukDate } from '@/lib/complianceTypes';
import '../workers.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My job seeker profile | TLGB' };

function Ticks({ name, opts, chosen }: { name: string; opts: Opt[]; chosen: string[] }) {
  return (
    <>
      {opts.map((o) => (
        <label key={o.key}><input type="checkbox" name={name} value={o.key} defaultChecked={chosen.includes(o.key)} /> {o.label}</label>
      ))}
    </>
  );
}

function Pick({ name, opts, value, empty }: { name: string; opts: Opt[]; value: string | null; empty: string }) {
  return (
    <select name={name} defaultValue={value ?? ''}>
      <option value="">{empty}</option>
      {opts.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
    </select>
  );
}

type SP = Promise<{ error?: string; saved?: string; published?: string; paused?: string }>;

export default async function SeekerPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const email = await getSessionEmail();
  if (!email) redirect('/login?next=/seeker');
  const s = await seekerByEmail(email);
  if (!s) redirect('/looking-for-work');

  const live = seekerLive(s);
  const expired = s.status === 'live' && !live;
  const complete = !!(s.headline && s.postcode);

  return (
    <div className="narrow" style={{ maxWidth: 860 }}>
      <div className="account-head">
        <h1>My job seeker profile</h1>
        <form action="/api/auth/logout" method="post"><button type="submit">Log out</button></form>
      </div>
      <p className="muted">Logged in as {email}</p>

      {sp.error && <p className="err big">{sp.error}</p>}
      {sp.published && <p className="ok-box">Your profile is live. Employers can now find you on the <Link href="/workers">workers board</Link>.</p>}
      {sp.saved && <p className="ok-box">Saved.</p>}
      {sp.paused && <p className="ok-box">Your profile is paused and hidden from employers.</p>}

      <div className={`wk-status${live ? '' : ' off'}`}>
        <p>
          {live ? <><strong>Live</strong> until {ukDate(s.expires_at)}. Viewed by employers {s.view_count} time{s.view_count === 1 ? '' : 's'}.</>
            : expired ? <><strong>Expired</strong> on {ukDate(s.expires_at)}. Press keep it live to show it again.</>
            : s.status === 'paused' ? <><strong>Paused.</strong> Employers cannot see it.</>
            : <><strong>Not published yet.</strong> Fill in the form below and press save and publish.</>}
        </p>
        <div className="wk-actions">
          {live && <Link href={`/workers/${s.id}`} className="wk-btn">View my profile</Link>}
          {complete && !live && (
            <form method="post" action="/api/seeker/action"><input type="hidden" name="action" value="renew" /><button type="submit" className="wk-btn go">{expired ? 'Keep it live' : 'Publish'}</button></form>
          )}
          {live && (
            <>
              <form method="post" action="/api/seeker/action"><input type="hidden" name="action" value="renew" /><button type="submit" className="wk-btn">Keep it live another {SEEKER_LIVE_DAYS} days</button></form>
              <form method="post" action="/api/seeker/action"><input type="hidden" name="action" value="pause" /><button type="submit" className="wk-btn">Pause</button></form>
            </>
          )}
        </div>
      </div>

      <form method="post" action="/api/seeker/save" className="wk-form">
        <div className="wk-section">
          <h2>About you</h2>
          <div className="row">
            <label>First name<input type="text" name="first_name" required maxLength={60} defaultValue={s.first_name} /></label>
            <label>Surname<input type="text" name="last_name" required maxLength={60} defaultValue={s.last_name} /></label>
          </div>
          <label className="chk" style={{ marginTop: 8 }}><input type="checkbox" name="show_full_name" value="yes" defaultChecked={s.show_full_name} /> Show my full surname to employers (otherwise just the first letter)</label>
          <label style={{ marginTop: 10 }}>One-line summary
            <input type="text" name="headline" required minLength={10} maxLength={120} defaultValue={s.headline ?? ''} placeholder="e.g. Soft landscaper, 20 years' experience, CSCS and PA1/PA6" />
          </label>
          <div className="row" style={{ marginTop: 10 }}>
            <label>Role you are looking for<Pick name="level" opts={LEVELS} value={s.level} empty="Choose a role" /></label>
            <label>Years in the trade<input type="number" name="years_experience" min={0} max={70} defaultValue={s.years_experience ?? ''} /></label>
          </div>
          <label style={{ marginTop: 10 }}>A bit more about you <span className="hint">Optional. The kind of jobs you have done, what you are good at, what you want next.</span>
            <textarea name="about" maxLength={3000} defaultValue={s.about ?? ''} />
          </label>
          <label style={{ marginTop: 10 }}>Companies you have worked for <span className="hint">Optional. One per line, with dates if you like.</span>
            <textarea name="past_employers" maxLength={1500} defaultValue={s.past_employers ?? ''} placeholder={'e.g. Green Spaces Ltd, 2018 to 2024, landscape operative'} />
          </label>
        </div>

        <div className="wk-section">
          <h2>Where you can work</h2>
          <div className="row">
            <label>Your postcode <span className="hint">Employers only see the first half, for example SG5.</span>
              <input type="text" name="postcode" required maxLength={10} defaultValue={s.postcode ?? ''} autoComplete="postal-code" /></label>
            <label>How far you will travel each day (miles)<input type="number" name="travel_miles" min={0} max={500} defaultValue={s.travel_miles} /></label>
          </div>
          <label className="chk" style={{ marginTop: 8 }}><input type="checkbox" name="stay_away" value="yes" defaultChecked={s.stay_away} /> Happy to stay away from home for the right job</label>
        </div>

        <div className="wk-section">
          <h2>Skills</h2>
          <div className="wk-ticks">
            {SKILL_GROUPS.map((g) => (
              <div key={g.group} style={{ display: 'contents' }}>
                <div className="wk-sub">{g.group}</div>
                <Ticks name="skills" opts={g.items} chosen={s.skills} />
              </div>
            ))}
          </div>
          <label style={{ marginTop: 12 }}>Anything else you can do<textarea name="other_skills" maxLength={1000} defaultValue={s.other_skills ?? ''} /></label>
        </div>

        <div className="wk-section">
          <h2>Cards, tickets and licences</h2>
          <div className="wk-ticks">
            {QUAL_GROUPS.filter((g) => g !== 'Other').map((g) => (
              <div key={g} style={{ display: 'contents' }}>
                <div className="wk-sub">{g}</div>
                <Ticks name="cards" opts={QUAL_TYPES.filter((q) => q.group === g)} chosen={s.cards} />
              </div>
            ))}
            <div className="wk-sub">Driving licence</div>
            <Ticks name="licences" opts={LICENCES} chosen={s.licences} />
          </div>
          <label style={{ marginTop: 12 }}>Other qualifications <span className="hint">For example NVQ Level 2 Horticulture, or the colour and category of your CSCS card.</span>
            <textarea name="other_cards" maxLength={500} defaultValue={s.other_cards ?? ''} />
          </label>
        </div>

        <div className="wk-section">
          <h2>What you are looking for</h2>
          <div className="wk-ticks">
            <div className="wk-sub">Type of work</div>
            <Ticks name="work_types" opts={WORK_TYPES} chosen={s.work_types} />
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <label>Available from <span className="hint">Leave blank if you can start now.</span><input type="date" name="available_from" defaultValue={s.available_from ?? ''} /></label>
            <label>Available until <span className="hint">Leave blank if open-ended.</span><input type="date" name="available_until" defaultValue={s.available_until ?? ''} /></label>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <label>Pay from (£)<input type="text" inputMode="decimal" name="pay_min" defaultValue={s.pay_min ?? ''} placeholder="e.g. 15" /></label>
            <label>Pay up to (£)<input type="text" inputMode="decimal" name="pay_max" defaultValue={s.pay_max ?? ''} placeholder="e.g. 18" /></label>
            <label>Per<Pick name="pay_period" opts={PAY_PERIODS} value={s.pay_period} empty="Choose" /></label>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <label>Vehicle<Pick name="vehicle" opts={VEHICLE} value={s.vehicle} empty="Choose" /></label>
            <label>Tools<Pick name="tools" opts={TOOLS} value={s.tools} empty="Choose" /></label>
            <label>People available, including you <span className="hint">More than 1 if you have a team.</span><input type="number" name="team_size" min={1} max={50} defaultValue={s.team_size} /></label>
          </div>
        </div>

        <div className="wk-section">
          <h2>How employers contact you</h2>
          <p className="muted small" style={{ marginTop: 0 }}>Only paying TLGB members and checked main contractors can see your name and contact details. Everyone else sees your profile without them.</p>
          <label className="chk"><input type="checkbox" name="show_email" value="yes" defaultChecked={s.show_email} /> Show my email address ({email})</label>
          <label className="chk"><input type="checkbox" name="show_phone" value="yes" defaultChecked={s.show_phone} /> Show my phone number</label>
          <label style={{ marginTop: 8, maxWidth: 320 }}>Phone<input type="tel" name="phone" maxLength={20} defaultValue={s.phone ?? ''} autoComplete="tel" /></label>
        </div>

        <div className="wk-actions">
          <button type="submit" name="publish" value="yes" className="wk-btn go">{live ? 'Save' : 'Save and publish'}</button>
          {!live && <button type="submit" className="wk-btn">Save without publishing</button>}
        </div>
        <p className="muted small" style={{ margin: 0 }}>Profiles stay on the board for {SEEKER_LIVE_DAYS} days. We email you a week before so you can keep it live. Please do not include your date of birth, national insurance number or anything you would not want an employer to see.</p>
      </form>

      <details className="panel" style={{ marginTop: 24 }}>
        <summary><strong>Delete my profile</strong></summary>
        <form method="post" action="/api/seeker/action" className="wk-actions" style={{ marginTop: 10 }}>
          <input type="hidden" name="action" value="delete" />
          <label className="small"><input type="checkbox" name="confirm" value="yes" /> Delete my profile and all its details now</label>
          <button type="submit" className="wk-btn">Delete</button>
        </form>
      </details>
    </div>
  );
}
