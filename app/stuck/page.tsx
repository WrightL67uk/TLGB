import type { Metadata } from 'next';
import { db } from '@/lib/supabase';
import { peekLoginToken } from '@/lib/session';

export const metadata: Metadata = { title: 'Need a hand? | The Little Green Book', robots: { index: false } };
export const dynamic = 'force-dynamic';

/** Reached from the "I'm stuck" button in a sign-up reminder. Token proves it came from the email. */
export default async function StuckPage({ searchParams }: { searchParams: Promise<{ b?: string; t?: string; done?: string; stop?: string; stopped?: string }> }) {
  const sp = await searchParams;
  if (sp.stopped) {
    return (
      <main className="container narrow">
        <h1>Reminders stopped</h1>
        <p>We will not email you about finishing your listing again. Your account is still there if you change your mind: log in at any time and carry on where you left off.</p>
      </main>
    );
  }
  if (sp.done) {
    return (
      <main className="container narrow">
        <h1>Thanks, we have got it</h1>
        <p>One of us will email you shortly. If it is quicker, you can also reach us at <a href="mailto:admin@tlgb.co.uk">admin@tlgb.co.uk</a>.</p>
      </main>
    );
  }
  const id = sp.b ?? ''; const token = sp.t ?? '';
  const email = /^[0-9a-f-]{36}$/i.test(id) && token ? await peekLoginToken(token) : null;
  const { data: b } = email ? await db().from('businesses').select('id, trading_name, email').eq('id', id).eq('email', email).maybeSingle() : { data: null };
  if (!b) {
    return (
      <main className="container narrow">
        <h1>That link has expired</h1>
        <p>No problem. Email us at <a href="mailto:admin@tlgb.co.uk">admin@tlgb.co.uk</a> and tell us where you got stuck, and we will sort it with you.</p>
      </main>
    );
  }
  if (sp.stop) {
    return (
      <main className="container narrow">
        <h1>Stop the reminders?</h1>
        <p>We will stop emailing you about finishing the listing for {b.trading_name}. Your account stays open, so you can come back whenever you like.</p>
        <form method="post" action="/api/stuck">
          <input type="hidden" name="b" value={b.id} /><input type="hidden" name="t" value={token} /><input type="hidden" name="stop" value="1" />
          <button className="primary">Yes, stop the reminders</button>
        </form>
        <p className="muted small">Stuck rather than finished with us? <a href={`/stuck?b=${b.id}&t=${encodeURIComponent(token)}`}>Ask for help instead</a>.</p>
      </main>
    );
  }
  return (
    <main className="container narrow">
      <h1>Where did you get stuck?</h1>
      <p>Tell us in a line or two and one of us will come back to you. Or leave it blank and just press send, and we will email you to ask.</p>
      <form method="post" action="/api/stuck">
        <input type="hidden" name="b" value={b.id} /><input type="hidden" name="t" value={token} />
        <label>What is getting in the way? <span className="muted">(optional)</span>
          <textarea name="note" rows={4} maxLength={1000} placeholder="e.g. I can't find my insurance certificate, or I'm not sure which plan to pick" />
        </label>
        <button className="primary">Send</button>
      </form>
      <p className="muted small">Listing: {b.trading_name}. You can also email <a href="mailto:admin@tlgb.co.uk">admin@tlgb.co.uk</a>.</p>
    </main>
  );
}
