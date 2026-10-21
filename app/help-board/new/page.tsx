import Link from 'next/link';
import { redirect } from 'next/navigation';
import '../../resources.css';
import { getMembership } from '@/lib/membership';
import { TRADES } from '@/lib/config';
import { HELP_KINDS } from '@/lib/resources';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ask for help | The Little Green Book' };

export default async function NewHelpRequest({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const m = await getMembership();
  if (!m.loggedIn) redirect('/login?next=/help-board/new');
  if (!m.paid) redirect(m.unpaidId ? `/account/${m.unpaidId}` : '/help-board');
  const { error } = await searchParams;
  return (
    <article className="guide">
      <h1>Ask for help</h1>
      <p className="lead">Your request shows on the help board for 60 days, or until you close it. Logged-in trades see your business name and email so they can contact you.</p>
      <form className="res-form" method="post" action="/api/help-board">
        {error && <p className="err big">{error}</p>}
        <label>What kind of help?
          <select name="kind" required defaultValue="">
            <option value="" disabled>Choose one</option>
            {HELP_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
          </select>
        </label>
        <label>Headline<input name="title" required maxLength={120} placeholder="e.g. Two landscapers needed for 3 weeks, Hitchin" /></label>
        <label>Details<textarea name="details" required maxLength={2000} placeholder="What the job is, what you need, rates or how you want to agree them, site conditions, tickets needed" /></label>
        <div>
          <strong>Which trades could help?</strong>
          <div className="checks">
            {TRADES.map((t) => <label key={t.slug}><input type="checkbox" name="trades" value={t.slug} /> {t.label}</label>)}
          </div>
        </div>
        <div className="row">
          <label>Site postcode<input name="postcode" required maxLength={10} /></label>
          <label>Town (shown on the board)<input name="town" maxLength={80} /></label>
        </div>
        <div className="row">
          <label>Needed from<input name="needed_from" type="date" /></label>
          <label>Needed until<input name="needed_until" type="date" /></label>
        </div>
        <button type="submit" className="primary">post request</button>
        <p className="muted small" style={{ margin: 0 }}>The exact postcode is only used to work out distances. <Link href="/help-board">Back to the help board</Link></p>
      </form>
    </article>
  );
}
