import Link from 'next/link';
import { getPricing, upgradeHref, upgradeLabel } from '@/lib/pricing';

type B = { id: string; status: string; stripe_subscription_id?: string | null };

/** Shown in place of a member tool to anyone not yet verified: what they would get, and one clear way in. */
export default async function UpgradePanel({ b, feature }: { b: B; feature: string }) {
  const pricing = await getPricing();
  const m = pricing.membership;
  const label = upgradeLabel(pricing, !!b.stripe_subscription_id);
  if (b.status !== 'approved') {
    return <div className="panel"><p>{feature} is part of verified membership. It becomes available once your listing is approved.</p></div>;
  }
  return (
    <div className="panel upgrade-panel">
      <p style={{ marginTop: 0 }}><strong>{feature} is part of verified membership.</strong></p>
      <ul className="upgrade-list">
        <li>The verified badge, and shown first in contractor searches</li>
        <li>Every lead and contractor job, with their contact details</li>
        <li>Compliance pack, PQQ answer bank, estimate requests, payment tracker and your own website</li>
      </ul>
      <Link href={upgradeHref(pricing, b.id)} className="primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
        {label.charAt(0).toUpperCase() + label.slice(1)}
      </Link>
      {pricing.mode === 'membership' && (
        <span className="muted small"> From &pound;{m.monthly} a month{m.trial_days > 0 && !b.stripe_subscription_id ? `, nothing to pay for ${m.trial_days} days` : ''}. Cancel any time.</span>
      )}
    </div>
  );
}
