import Link from 'next/link';

const pounds = (n: number) => `£${Number.isInteger(n) ? n : n.toFixed(2)}`;

type Props = {
  monthly: number;
  yearly: number;
  trial: number;
  save: { months: number; pounds: number; perMonth: number };
  live: boolean;
  /** On the public join page the cards link on to the account step; in an account they post straight to billing. */
  target: { join: true } | { businessId: string; onFree: boolean };
};

/** The three plan cards: free listing, verified monthly, verified yearly (the one we push). */
export default function PlanCards({ monthly, yearly, trial, save, live, target }: Props) {
  const go = (kind: 'free' | 'month' | 'year', label: string, cls: string) =>
    'join' in target ? (
      <Link href={`/join?plan=${kind}`} className={`plan-btn ${cls}`}>{label}</Link>
    ) : kind === 'free' ? (
      <form method="post" action="/api/billing/free">
        <input type="hidden" name="business_id" value={target.businessId} />
        <button type="submit">{label}</button>
      </form>
    ) : (
      <form method="post" action="/api/billing/checkout">
        <input type="hidden" name="business_id" value={target.businessId} />
        <input type="hidden" name="interval" value={kind} />
        <button type="submit" className={cls} disabled={!live}>{label}</button>
      </form>
    );
  const freeLabel = 'join' in target ? 'Choose free' : target.onFree ? 'Stay on free' : 'Continue free';

  return (
    <>
      <div className="plans">
        <section className="plan plan-free">
          <h2>Free listing</h2>
          <p className="plan-price">£0</p>
          <p className="muted small">Shown as unverified</p>
          <ul>
            <li className="yes">Basic listing in search</li>
            <li className="yes">Read the help board</li>
            <li className="no">Verified badge</li>
            <li className="no">Leads and contractor jobs</li>
            <li className="no">Member tools</li>
          </ul>
          {go('free', freeLabel, '')}
        </section>

        <section className="plan plan-mid">
          {trial > 0 && <span className="plan-badge">{trial} days free</span>}
          <h2>Verified monthly</h2>
          <p className="plan-price">{pounds(monthly)} <span>a month</span></p>
          <p className="muted small">Cancel any time</p>
          <ul>
            <li className="yes">Verified badge, shown first</li>
            <li className="yes">Every lead and contractor job</li>
            <li className="yes">Compliance pack, PQQ bank</li>
            <li className="yes">Price requests, free website</li>
            <li className="yes">Payment tracker, team records</li>
          </ul>
          {go('month', trial ? 'Start free trial' : 'Pay monthly', 'plan-go')}
        </section>

        <section className="plan plan-best">
          <span className="plan-badge">Best value</span>
          {save.months > 0 && <span className="plan-badge">{save.months === 1 ? '1 month' : `${save.months} months`} free</span>}
          {trial > 0 && save.months === 0 && <span className="plan-badge">{trial} days free</span>}
          <h2>Verified yearly</h2>
          <p className="plan-price plan-price-big">{pounds(yearly)} <span>a year</span></p>
          {save.pounds > 0 && <p className="plan-save">Works out at {pounds(save.perMonth)} a month. Save {pounds(save.pounds)}.</p>}
          <ul>
            <li className="yes">Everything in monthly</li>
            <li className="yes">Verified badge, shown first</li>
            <li className="yes">Every lead and contractor job</li>
            <li className="yes">Compliance pack, PQQ bank</li>
            <li className="yes">Price requests, free website</li>
            <li className="yes">One payment, sorted for the year</li>
          </ul>
          {go('year', trial ? 'Start free trial' : 'Pay yearly', 'plan-go plan-go-big')}
        </section>
      </div>

    </>
  );
}
