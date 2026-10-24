import Link from 'next/link';
import { getMembership } from '@/lib/membership';
import { RETENTION_CHECKED, RETENTION_STEPS, RETENTION_SOURCES, RETENTION_BANDS, RETENTION_WANTS } from '@/lib/retentionBan';
import '../../resources.css';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'The retention ban: what it means for subcontractors | The Little Green Book',
  description: 'Cash retentions in construction contracts are being banned. Where the Commercial Payments Bill has got to, when it could start, and what landscaping and external works subcontractors should do now.',
};

export default async function RetentionBanGuide({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const sp = await searchParams;
  const m = await getMembership();

  return (
    <article className="guide">
      <h1>The retention ban: what it means for you</h1>
      <p className="lead">
        The government is banning cash retentions in construction contracts. It is the biggest change to subcontract payment
        since the Construction Act. This page tracks where the law has got to and what to do while it goes through.
      </p>
      <p className="muted small">Last checked {RETENTION_CHECKED}. The bill can still change. This is a summary, not legal advice.</p>

      <h2>Where it has got to</h2>
      <ol className="rb-steps">
        {RETENTION_STEPS.map((s) => (
          <li key={s.title} className={s.done ? 'done' : ''}>
            <span>{s.date}</span>
            <b>{s.title}</b>
            <em>{s.text}</em>
          </li>
        ))}
      </ol>

      <div className="callout">
        <p><strong>In short:</strong> nothing changes on your current jobs yet. Even once the bill becomes law, there is a two-year transition from a start date the government has not set. So retention is likely to stay in most subcontracts for some time yet.</p>
      </div>

      <h2>What the bill says, as it stands</h2>
      <ul>
        <li><strong>Retention clauses are banned</strong> in construction contracts. That means any clause letting the payer deduct or hold back part of a payment until a condition is met, such as making good defects.</li>
        <li><strong>Two-year transition.</strong> From the start date, new retention clauses can still be agreed for two years. After that, new ones are void.</li>
        <li><strong>Money held under clauses agreed in the transition</strong> must be released within one further year, whatever the contract says.</li>
        <li><strong>Clauses agreed before the start date</strong> appear to be unaffected, so retention on those jobs runs to the end of the defects period as the contract says.</li>
        <li><strong>A penalty for unlawful retention.</strong> As the bill was introduced, a contractor who withholds retention after the transition can be made to pay it plus a further 50%. Lawyers have pointed out gaps in how this is worded, so it may change.</li>
        <li><strong>The same bill</strong> sets a 60-day maximum payment period for private construction contracts (30 days where a public body pays), with exemptions based on business size, and gives the Small Business Commissioner new powers over late payment.</li>
      </ul>

      <h2>What contractors may ask for instead</h2>
      <p>Main contractors and clients will still want security for defects. Expect to be asked for one or more of these:</p>
      <h3>Retention bonds</h3>
      <p>A bank or insurer guarantees the money that would have been retained. If you do not fix defects, the contractor claims on the bond and the provider recovers it from you. You keep your cash, but you pay a premium and the provider will look hard at your accounts. Bonds are already allowed and you can offer one today to get cash retention released.</p>
      <h3>Insurance-backed defects cover</h3>
      <p>Cover that pays to put defects right if you do not. Less common in landscaping, but likely to grow once retentions go.</p>
      <h3>A bigger final payment</h3>
      <p>The last stage payment is held until practical completion or the end of the defects period. Watch this one: if it works like a retention, it may be challenged as one. Check how the final stage is worded before you sign.</p>
      <h3>Longer defects periods and tighter notice terms</h3>
      <p>Expect more detailed defects clauses, shorter times to attend, and contractors recovering the cost of others fixing your defects. For soft landscaping, make sure plant failures caused by lack of watering or damage by others are excluded.</p>

      <h2>What to do now</h2>
      <ol>
        <li><strong>Chase what you are owed.</strong> Retention already held is not affected by the ban. Log every job and release date in the <Link href={m.loggedIn ? '/account/payments' : '/login?next=/account/payments'}>payment tracker</Link> and send the release request the day it falls due.</li>
        <li><strong>Do not agree longer retention periods</strong> or new retention terms you would not have accepted before. The transition is not a reason to give more away.</li>
        <li><strong>Read the final payment terms</strong> on new orders. Retention under another name is the most likely way round the ban.</li>
        <li><strong>Get your accounts in order.</strong> Bond providers price on your balance sheet and filed accounts. Up to date, clean accounts mean cheaper cover.</li>
        <li><strong>Price the difference.</strong> If a contractor wants a bond instead of retention, the premium is a cost of the job. Include it.</li>
      </ol>

      <h2 id="interest">TLGB retention bond and defects cover</h2>
      <p>
        We are talking to providers about a scheme for members: retention bonds and defects cover priced for small landscaping
        and external works firms, using your TLGB record to help with the checks. Tell us you are interested and roughly how
        much retention you have tied up. It helps us show providers there is demand, and we will let you know when it is ready.
      </p>
      {sp.sent ? (
        <p className="ok-box">Thanks, we have your details. We will be in touch when the scheme is ready.</p>
      ) : (
        <form method="post" action="/api/retention-interest" className="rb-form">
          {sp.error && <p className="err big">{sp.error}</p>}
          <label className="hp" aria-hidden="true">Leave this empty<input name="company_url" tabIndex={-1} autoComplete="off" /></label>
          <label>Your name<input name="name" required minLength={2} maxLength={120} /></label>
          <label>Business name<input name="business" maxLength={160} /></label>
          <label>Email<input type="email" name="email" required maxLength={200} defaultValue={m.email ?? ''} /></label>
          <label>Retention you have held at the moment, roughly
            <select name="band" defaultValue="">
              <option value="">Prefer not to say</option>
              {RETENTION_BANDS.map((b) => <option key={b}>{b}</option>)}
            </select>
          </label>
          <fieldset>
            <legend>I am interested in</legend>
            {RETENTION_WANTS.map((w) => (
              <label key={w.key} className="chk"><input type="checkbox" name="wants" value={w.key} defaultChecked={w.key !== 'defects'} /> {w.label}</label>
            ))}
          </fieldset>
          <p className="muted small">We use these details only to contact you about this scheme and changes to the law. We will not pass them to a provider without asking you first. See our <Link href="/legal/privacy">privacy notice</Link>.</p>
          <div><button type="submit" className="primary">Register interest</button></div>
        </form>
      )}

      <h2>Sources</h2>
      <ul className="small">
        {RETENTION_SOURCES.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a></li>)}
      </ul>

      <div className="next">
        <Link href="/tools/payment-dates" className="sq sq-rust">Payment dates calculator</Link>
        <Link href="/guides" className="sq" style={{ background: 'var(--forest)' }}>All guides</Link>
      </div>
    </article>
  );
}
