import Link from 'next/link';
import { getSeeker } from '@/lib/seekers';
import '../workers.css';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Looking for landscaping work? Post a free profile | The Little Green Book',
  description: 'Free job seeker profiles for landscapers, grounds maintenance staff, groundworkers, tree surgeons and supervisors. Seen by checked landscaping firms and main contractors.',
};

export default async function LookingForWork({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string; deleted?: string }> }) {
  const sp = await searchParams;
  const me = await getSeeker();

  return (
    <div>
      <div className="wk-hero">
        <h1>Looking for landscaping work?</h1>
        <p>Put up a free profile and let landscaping firms and main contractors find you. Add your experience, skills, cards and tickets, when you are free and what you are looking for.</p>
      </div>

      {sp.deleted && <p className="ok-box">Your profile has been deleted.</p>}

      <div className="wk-points">
        <div><h3>Free, always</h3><p>No fees for job seekers. You only need an email address.</p></div>
        <div><h3>Seen by the right people</h3><p>Checked landscaping firms and main contractors who use TLGB to find staff and subcontractors.</p></div>
        <div><h3>You stay in control</h3><p>Your name and contact details are only shown to those employers. Pause or delete your profile at any time.</p></div>
        <div><h3>Employed, self-employed or a team</h3><p>Full-time, day rate, CIS, seasonal, apprenticeships, or a whole gang available for a job.</p></div>
      </div>

      <div className="narrow" id="start">
        {me ? (
          <div className="panel">
            <p>You already have a profile{me.status === 'live' ? ' on the board' : ''}.</p>
            <Link href="/seeker" className="wk-btn go">Go to my profile</Link>
          </div>
        ) : sp.sent ? (
          <div className="ok-box">
            <p><strong>Check your email.</strong> We have sent you a link to finish your profile. It works once and lasts an hour.</p>
            <p className="small" style={{ margin: 0 }}>Not arrived? Check your junk folder, or <Link href="/login?next=/seeker">ask for a new link</Link>.</p>
          </div>
        ) : (
          <form method="post" action="/api/seeker/join" className="wk-form">
            <h2 style={{ margin: 0 }}>Start your free profile</h2>
            {sp.error && <p className="err big">{sp.error}</p>}
            <label className="hp" aria-hidden="true">Leave this empty<input name="company_url" tabIndex={-1} autoComplete="off" /></label>
            <div className="row">
              <label>First name<input type="text" name="first_name" required maxLength={60} autoComplete="given-name" /></label>
              <label>Surname<input type="text" name="last_name" required maxLength={60} autoComplete="family-name" /></label>
            </div>
            <label>Email<input type="email" name="email" required maxLength={200} autoComplete="email" />
              <span className="hint">We email you a link to finish your profile. No password needed.</span></label>
            <label className="chk"><input type="checkbox" name="agree" value="yes" required /> I agree to the <Link href="/legal/terms" target="_blank">website terms</Link> and have read the <Link href="/legal/privacy" target="_blank">privacy notice</Link>.</label>
            <div><button type="submit" className="wk-btn go">Email me a link</button></div>
            <p className="muted small" style={{ margin: 0 }}>Already have a profile? <Link href="/login?next=/seeker">Log in</Link>.</p>
          </form>
        )}
        <p className="muted small" style={{ marginTop: 16 }}>Hiring? <Link href="/workers">See people looking for work</Link>.</p>
      </div>
    </div>
  );
}
