import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/supabase';
import { getSessionEmail } from '@/lib/session';
import { LEVELS, WORK_TYPES, label, skillLabel, payText } from '@/lib/seekerTypes';
import { qualLabel } from '@/lib/teamTypes';
import { ukDate } from '@/lib/complianceTypes';
import { vacancyLive, type Vacancy } from '@/lib/vacancies';
import '../../../workers.css';

export const dynamic = 'force-dynamic';

type Row = Vacancy & { businesses: { id: string; trading_name: string; status: string } | null };

async function load(vid: string) {
  if (!/^[0-9a-f-]{36}$/i.test(vid)) return null;
  const { data } = await db().from('vacancies').select('*, businesses(id, trading_name, status)').eq('id', vid).neq('status', 'removed').maybeSingle();
  return (data as Row | null) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ vid: string }> }) {
  const v = await load((await params).vid);
  return v
    ? { title: `${v.title}${v.area ? `, ${v.area}` : ''} | Recruitment | The Little Green Book`, description: v.description.slice(0, 160) }
    : { title: 'Vacancy | The Little Green Book' };
}

/** A vacancy. Anyone can read the job; the employer's name and how to apply are for logged-in people (a free job seeker profile is enough). */
export default async function VacancyPage({ params }: { params: Promise<{ vid: string }> }) {
  const v = await load((await params).vid);
  if (!v) notFound();
  const signedIn = !!(await getSessionEmail());
  const here = `/recruitment/vacancies/${v.id}`;
  const live = vacancyLive(v);
  if (live) await db().from('vacancies').update({ view_count: v.view_count + 1 }).eq('id', v.id);
  const biz = v.businesses;
  const pay = payText(v);
  const subject = encodeURIComponent(`${v.title} (seen on The Little Green Book)`);

  return (
    <div>
      <p className="small"><Link href="/recruitment">All vacancies</Link></p>
      {!live && <p className="err big">This vacancy has closed. <Link href="/recruitment">See current vacancies</Link>.</p>}
      <div className="wk-profile">
        <div>
          <section>
            <h1 style={{ margin: '0 0 6px' }}>{v.title}</h1>
            <div className="wk-meta">
              <b>{!signedIn ? 'Employer shown when you sign in' : biz && biz.status === 'approved' ? <Link href={`/b/${biz.id}`}>{biz.trading_name}</Link> : biz?.trading_name ?? 'TLGB member'}</b>
              <span>{v.area}</span>
              {pay && <span>{pay}</span>}
              <span>{v.start_date && v.start_date > new Date().toISOString().slice(0, 10) ? `Starts ${ukDate(v.start_date)}` : 'Start as soon as possible'}</span>
            </div>
            <div className="wk-tags">
              {v.work_types.map((k) => <span key={k} className="wk-tag now">{label(WORK_TYPES, k)}</span>)}
              {v.level && <span className="wk-tag">{label(LEVELS, v.level)}</span>}
            </div>
          </section>
          <section>
            <h2>About the job</h2>
            <p style={{ whiteSpace: 'pre-line', margin: 0 }}>{v.description}</p>
          </section>
          {(v.skills.length > 0 || v.cards.length > 0 || v.own_vehicle) && (
            <section>
              <h2>What they are looking for</h2>
              <div className="wk-tags">
                {v.skills.map((k) => <span key={k} className="wk-tag">{skillLabel(k)}</span>)}
                {v.cards.map((k) => <span key={k} className="wk-tag card">{qualLabel(k)}</span>)}
                {v.own_vehicle && <span className="wk-tag card">Own vehicle needed</span>}
              </div>
            </section>
          )}
        </div>
        <aside>
          {live && !signedIn && (
            <div className="rc-apply">
              <h2 style={{ margin: '0 0 4px', color: 'var(--forest)', fontSize: '1.1rem' }}>See who is hiring and how to apply</h2>
              <p className="small muted" style={{ margin: 0 }}>Create a free job seeker profile to see the employer and their contact details. It takes a minute and you only need an email address.</p>
              <Link href={`/looking-for-work?next=${encodeURIComponent(here)}#start`} className="wk-btn go">Create a free profile</Link>
              <p className="small muted" style={{ margin: '10px 0 0' }}>Already have one? <Link href={`/login?next=${encodeURIComponent(here)}`}>Log in</Link></p>
            </div>
          )}
          {live && signedIn && (
            <div className="rc-apply">
              <h2 style={{ margin: '0 0 4px', color: 'var(--forest)', fontSize: '1.1rem' }}>How to apply</h2>
              <p className="small muted" style={{ margin: 0 }}>Contact {biz?.trading_name ?? 'the employer'} directly.</p>
              {v.apply_url && <a href={v.apply_url} target="_blank" rel="noopener nofollow" className="wk-btn go">Apply online</a>}
              {v.apply_email && <a href={`mailto:${v.apply_email}?subject=${subject}`} className={`wk-btn ${v.apply_url ? '' : 'go'}`}>Email {v.apply_email}</a>}
              {v.apply_phone && <a href={`tel:${v.apply_phone.replace(/\s/g, '')}`} className="wk-btn">Call {v.apply_phone}</a>}
              <p className="small muted" style={{ margin: '10px 0 0' }}>Posted {ukDate(v.created_at.slice(0, 10))}.</p>
            </div>
          )}
          {!signedIn ? null : <div className="panel small" style={{ marginTop: 14 }}>
            <p style={{ marginTop: 0 }}><strong>Looking for work?</strong> Post a free profile and we will email you vacancies like this one.</p>
            <Link href="/looking-for-work">Post a free profile</Link>
          </div>}
        </aside>
      </div>
      <p className="muted small" style={{ marginTop: 18 }}>Vacancies are posted by TLGB members. We check member businesses, but not each vacancy, so make your own checks before you accept a job. Something wrong with this vacancy? <a href={`mailto:admin@tlgb.co.uk?subject=${encodeURIComponent(`Vacancy ${v.id}`)}`}>Tell us</a>.</p>
    </div>
  );
}
