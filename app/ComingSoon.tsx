import Link from 'next/link';

const TEASERS = [
  ['Get found', 'Be in front of the people who hand out landscaping and external works packages near you.'],
  ['Less paperwork', 'The admin that eats into your evenings, made a lot lighter.'],
  ['Work that comes to you', 'Opportunities brought to you, instead of you chasing them.'],
  ['Built by the trade', 'Made by people from the industry who know how the work really gets won.'],
];

export default function ComingSoon({ joined, already, error, from = '/', src }: { joined?: boolean; already?: boolean; error?: string; from?: '/' | '/waitlist'; src?: string }) {
  return (
    <div className="landing coming-soon">
      <section className="band hero-band">
        <div className="band-in cs-in">
          <div className="cs-copy">
            <p className="cs-kicker">Coming soon</p>
            <h1>Something good is growing</h1>
            <p className="cs-lead">
              The Little Green Book is a new home for landscaping and external works trades. We are putting the finishing
              touches to it now.
            </p>
            <div className="cs-perks">
              <strong>Join the waiting list and you will:</strong>
              <ul>
                <li>get a one-time discount code sent to your inbox before we open</li>
                <li>be offered membership ahead of anyone else</li>
              </ul>
            </div>
          </div>

          <div className="cs-card">
            {joined ? (
              <div className="cs-done">
                <h2>{already ? 'You are already on the list' : 'You are on the list'}</h2>
                <p>
                  {already
                    ? 'We already have your details, so there is nothing more to do.'
                    : 'Thanks for joining. We have sent you an email to confirm.'}{' '}
                  Your discount code will arrive in your inbox before we open, and you will be offered membership before anyone else.
                </p>
              </div>
            ) : (
              <form action="/api/waitlist" method="post" className="cs-form">
                <h2>Join the waiting list</h2>
                {error && <p className="err">{error}</p>}
                <label>Your name<input name="name" required maxLength={100} autoComplete="name" /></label>
                <label>Business name<input name="business_name" required maxLength={120} autoComplete="organization" /></label>
                <label>Email<input name="email" type="email" required maxLength={200} autoComplete="email" /></label>
                <label>Phone<input name="phone" type="tel" required maxLength={30} autoComplete="tel" /></label>
                <input name="website_url" tabIndex={-1} autoComplete="off" className="hp" aria-hidden />
                <input type="hidden" name="from" value={from} />
                {src && <input type="hidden" name="src" value={src} />}
                <button type="submit" className="sq sq-rust">join the waiting list</button>
                <p className="small muted">
                  We only use these details to tell you about our launch and your discount. You can ask us to remove you at any
                  time. See our <Link href="/legal/privacy">privacy notice</Link>.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      <section className="band cs-teasers">
        <div className="band-in">
          <h2>What is coming</h2>
          <div className="cs-grid">
            {TEASERS.map(([t, b]) => (
              <div key={t} className="cs-tease">
                <h3>{t}</h3>
                <p>{b}</p>
              </div>
            ))}
          </div>
          <p className="cs-more">And a few more things we are keeping quiet until launch day.</p>
        </div>
      </section>
    </div>
  );
}
