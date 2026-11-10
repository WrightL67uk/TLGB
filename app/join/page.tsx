import { cookies } from 'next/headers';
import QuickStart from './QuickStart';
import JoinSteps from './JoinSteps';
import { CODE_COOKIE, describe, findCode, usable } from '@/lib/discounts';
import { getPricing, bandsWithPrices } from '@/lib/pricing';

export const metadata = { title: 'List your business | TLGB' };
export const dynamic = 'force-dynamic';


export default async function JoinPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const sp = await searchParams;
  const raw = sp.code || (await cookies()).get(CODE_COOKIE)?.value;
  const found = raw ? await findCode(raw).catch(() => null) : null;
  const offer = found && usable(found.code, found.uses) ? found.code : null;
  const pricing = await getPricing();
  const m = pricing.membership;
  const priceLine = pricing.mode === 'membership'
    ? `Next you choose a free listing, or verified membership from £${m.monthly} a month${m.trial_days ? ` with ${m.trial_days} days free` : ''}. Then add your details in your own time.`
    : 'Next you add your details in your own time and send them to us to check.';

  return (
    <div className="narrow">
      <JoinSteps on={1} />
      <h1>List your business</h1>
      <p className="lead">Takes two minutes to start. Every business is checked by hand before it goes live, so contractors know who they are dealing with.</p>
      {offer && (
        <p className="ok-box">
          Code <strong>{offer.code}</strong>: {describe(offer)}. It will be taken off when you choose a paid plan.
        </p>
      )}
      <QuickStart bands={bandsWithPrices(pricing).map(({ key, label }) => ({ key, label }))} priceLine={priceLine} />
    </div>
  );
}
