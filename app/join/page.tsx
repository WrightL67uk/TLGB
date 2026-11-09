import { cookies } from 'next/headers';
import JoinForm from './JoinForm';
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

  return (
    <div className="narrow">
      <h1>List your business</h1>
      <p className="lead">
        Every business is checked by hand before it goes live, so contractors know who they are dealing with.
      </p>
      {offer && (
        <p className="ok-box">
          Code <strong>{offer.code}</strong>: {describe(offer)}. It will be taken off when you pay for your listing, once you are approved.
        </p>
      )}
      <JoinForm prices={{ mode: pricing.mode, bands: bandsWithPrices(pricing), plans: pricing.plans, membership: pricing.membership }} />
    </div>
  );
}
