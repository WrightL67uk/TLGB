import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ownedBusiness } from '@/lib/account';
import { isPaid } from '@/lib/membership';
import { loadTeam, type TeamQual } from '@/lib/team';
import { QUAL_TYPES, QUAL_GROUPS, qualName, qualStatus, qualType, TEAM_WARN_DAYS } from '@/lib/teamTypes';
import { ukDate } from '@/lib/complianceTypes';
import '../../../pay.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Team and training | TLGB' };

function TypeSelect({ value }: { value?: string }) {
  return (
    <select name="qual_type" required defaultValue={value ?? ''}>
      <option value="" disabled>Pick a card or course</option>
      {QUAL_GROUPS.map((g) => (
        <optgroup key={g} label={g}>
          {QUAL_TYPES.filter((t) => t.group === g).map((t) => (
            <option key={t.key} value={t.key}>{t.label}{t.years ? ` (usually ${t.years} year${t.years === 1 ? '' : 's'})` : ''}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function QualFields({ bid, pid, q }: { bid: string; pid: string; q?: TeamQual }) {
  return (
    <>
      <input type="hidden" name="business_id" value={bid} />
      <input type="hidden" name="person_id" value={pid} />
      {q && <input type="hidden" name="qual_id" value={q.id} />}
      <div className="row">
        <label>Card or course<TypeSelect value={q?.qual_type} /></label>
        <label>Colour, category or level<input name="detail" maxLength={120} defaultValue={q?.detail ?? ''} placeholder={q ? qualType(q.qual_type)?.detail ?? 'Optional' : 'e.g. Blue skilled worker, A59 360 excavator'} /></label>
      </div>
      <div className="row">
        <label>Card or certificate number<input name="number" maxLength={40} defaultValue={q?.number ?? ''} placeholder="Optional" /></label>
        <label>Date passed or issued<input type="date" name="achieved_on" defaultValue={q?.achieved_on ?? ''} /></label>
        <label>Expiry date<input type="date" name="expiry" defaultValue={q?.expiry ?? ''} /></label>
      </div>
    </>
  );
}

export default async function TeamPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const own = await ownedBusiness(id);
  if (!own.ok) {
    if (own.status === 401) redirect(`/login?next=/account/${id}/team`);
    notFound();
  }
  const b = own.business;

  if (!isPaid(b)) {
    return (
      <div className="narrow">
        <p className="small"><Link href={`/account/${b.id}`}>Back to my listing</Link></p>
        <h1>Team and training</h1>
        <p className="lead">Record every CSCS card, plant ticket, PA1/PA6 and first aid certificate your team holds. We remind you before anything runs out and build your training matrix for you.</p>
        <div className="panel"><p>Team and training records are included with every paid membership.</p></div>
      </div>
    );
  }

  const team = await loadTeam(b.id);
  const all = team.flatMap((p) => p.quals.map((q) => ({ p, q, s: qualStatus(q.expiry) })));
  const expired = all.filter((x) => x.s.tone === 'bad');
  const soon = all.filter((x) => x.s.tone === 'warn');
  const attention = [...expired, ...soon].sort((x, y) => (x.q.expiry! < y.q.expiry! ? -1 : 1));

  return (
    <div className="narrow" style={{ maxWidth: 900 }}>
      <p className="small"><Link href={`/account/${b.id}`}>Back to my listing</Link> · <Link href={`/account/${b.id}/compliance`}>Compliance pack</Link></p>
      <h1>Team and training</h1>
      <p className="lead">Add each person and the cards and tickets they hold. We email you {TEAM_WARN_DAYS} days before anything expires, again at 30 days, and if it lapses, so you have time to book the course.</p>
      {sp.error && <p className="err big">{sp.error}</p>}
      {sp.saved && !sp.error && <p className="ok-box">Saved.</p>}

      <div className="pay-stats">
        <div className="pay-stat"><b>{team.length}</b><span>{team.length === 1 ? 'person' : 'people'}</span></div>
        <div className="pay-stat"><b>{all.length}</b><span>cards and qualifications</span></div>
        <div className={`pay-stat${soon.length ? ' bad' : ''}`}><b>{soon.length}</b><span>expiring in {TEAM_WARN_DAYS} days</span></div>
        <div className={`pay-stat${expired.length ? ' bad' : ''}`}><b>{expired.length}</b><span>expired</span></div>
      </div>

      <div className="pay-box">
        <h2>Training matrix</h2>
        <p>A landscape Word table of everyone and what they hold, coloured by expiry. Send it with tenders and site inductions.</p>
        <div className="pay-actions">
          <a className="pay-btn go" href={`/api/team/matrix?b=${b.id}`}>Download training matrix</a>
          <a className="pay-btn" href={`/api/team/matrix?b=${b.id}&numbers=0`}>Download without card numbers</a>
        </div>
        <p className="muted small" style={{ marginBottom: 0 }}>
          Compliance pack links that include <em>People and training</em> show this matrix too, without card numbers. Your PQQ answer bank also gets a summary that fills itself in. Please do not upload copies of individual cards: the details here are enough.
        </p>
      </div>

      {attention.length > 0 && (
        <div className="pay-box">
          <h2>Needs booking</h2>
          <div className="pay-wrap">
            <table className="pay-table">
              <thead><tr><th>Person</th><th>Card or course</th><th>Expiry</th><th></th></tr></thead>
              <tbody>
                {attention.map(({ p, q, s }) => (
                  <tr key={q.id}>
                    <td><a href={`#p-${p.id}`}>{p.name}</a></td>
                    <td>{qualName(q)}</td>
                    <td>{ukDate(q.expiry)}</td>
                    <td><span className={`pay-tag ${s.tone}`}>{s.label}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="pay-box">
        <h2>Add a person</h2>
        <form method="post" action="/api/team" className="grid">
          <input type="hidden" name="business_id" value={b.id} />
          <input type="hidden" name="action" value="person-add" />
          <div className="row">
            <label>Name<input name="name" required minLength={2} maxLength={80} placeholder="e.g. Sam Taylor" /></label>
            <label>Role<input name="role" maxLength={80} placeholder="e.g. Landscape operative, Supervisor" /></label>
          </div>
          <div><button type="submit" className="pay-btn go">Add person</button></div>
        </form>
      </div>

      {team.length === 0 && <p className="muted">No one added yet. Start with yourself and your supervisors, then add operatives.</p>}

      <div className="pay-jobs">
        {team.map((p) => {
          const worst = p.quals.some((q) => qualStatus(q.expiry).tone === 'bad') ? ' alert' : p.quals.some((q) => qualStatus(q.expiry).tone === 'warn') ? ' warn' : '';
          return (
            <div key={p.id} id={`p-${p.id}`} className={`pay-card${worst}`}>
              <h3>{p.name}</h3>
              <div className="pay-meta">{p.role ? <span>{p.role}</span> : null}<span>{p.quals.length} card{p.quals.length === 1 ? '' : 's'} and qualifications</span></div>

              {p.quals.length > 0 && (
                <div className="pay-wrap" style={{ marginTop: 10 }}>
                  <table className="pay-table">
                    <thead><tr><th>Card or course</th><th>Number</th><th>Passed</th><th>Expiry</th><th></th></tr></thead>
                    <tbody>
                      {p.quals.map((q) => {
                        const s = qualStatus(q.expiry);
                        return (
                          <tr key={q.id}>
                            <td>
                              {qualName(q)}
                              <details className="pay-edit">
                                <summary className="small">Edit</summary>
                                <form method="post" action="/api/team" className="grid">
                                  <input type="hidden" name="action" value="qual-edit" />
                                  <QualFields bid={b.id} pid={p.id} q={q} />
                                  <div className="pay-actions"><button type="submit" className="pay-btn go">Save</button></div>
                                </form>
                                <form method="post" action="/api/team" style={{ marginTop: 8 }}>
                                  <input type="hidden" name="business_id" value={b.id} />
                                  <input type="hidden" name="person_id" value={p.id} />
                                  <input type="hidden" name="qual_id" value={q.id} />
                                  <input type="hidden" name="action" value="qual-remove" />
                                  <button type="submit" className="pay-btn">Delete this record</button>
                                </form>
                              </details>
                            </td>
                            <td>{q.number ?? ''}</td>
                            <td>{ukDate(q.achieved_on)}</td>
                            <td>{ukDate(q.expiry)}</td>
                            <td><span className={`pay-tag ${s.tone === 'none' ? '' : s.tone}`}>{s.label}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <details className="pay-edit" open={p.quals.length === 0}>
                <summary>Add a card or course</summary>
                <form method="post" action="/api/team" className="grid">
                  <input type="hidden" name="action" value="qual-add" />
                  <QualFields bid={b.id} pid={p.id} />
                  <p className="muted small" style={{ margin: 0 }}>Leave the expiry blank and we work it out from the date passed for cards with a fixed life, such as CSCS (5 years) or first aid (3 years). Leave both blank for courses that do not expire.</p>
                  <div><button type="submit" className="pay-btn go">Add</button></div>
                </form>
              </details>

              <details className="pay-edit">
                <summary>Edit or remove {p.name.split(' ')[0]}</summary>
                <form method="post" action="/api/team" className="grid">
                  <input type="hidden" name="business_id" value={b.id} />
                  <input type="hidden" name="person_id" value={p.id} />
                  <input type="hidden" name="action" value="person-edit" />
                  <div className="row">
                    <label>Name<input name="name" required minLength={2} maxLength={80} defaultValue={p.name} /></label>
                    <label>Role<input name="role" maxLength={80} defaultValue={p.role ?? ''} /></label>
                  </div>
                  <div><button type="submit" className="pay-btn go">Save</button></div>
                </form>
                <form method="post" action="/api/team" className="pay-actions" style={{ marginTop: 10 }}>
                  <input type="hidden" name="business_id" value={b.id} />
                  <input type="hidden" name="person_id" value={p.id} />
                  <input type="hidden" name="action" value="person-remove" />
                  <label className="small"><input type="checkbox" name="confirm" value="yes" /> Remove {p.name} and all their records</label>
                  <button type="submit" className="pay-btn">Remove</button>
                </form>
              </details>
            </div>
          );
        })}
      </div>
    </div>
  );
}
