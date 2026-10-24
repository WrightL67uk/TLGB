// Contractor plans. Everything is free today. Each feature checks the plan rather than being
// hard-wired, so charging later means adding a plan here (and a Stripe price), not a rebuild.
// Founding contractors keep the free plan's limits whatever happens later.

export type PlanKey = 'free' | 'pro';

export type Entitlements = {
  label: string;
  /** Monthly price in pounds; 0 is free. Shown nowhere until a paid plan is switched on. */
  priceMonthly: number;
  canPostJobs: boolean;
  maxLiveJobs: number;
  maxUsers: number;
  maxFavourites: number;
  maxLists: number;
  canInvite: boolean;
  /** See insurance and accreditation status (with warnings) on saved trades. */
  complianceStatus: boolean;
  /** Future: emails when a saved trade's insurance or accreditation lapses. */
  complianceAlerts: boolean;
  /** Future: pinned, highlighted job posts. */
  featuredJobs: boolean;
};

export const PLANS: Record<PlanKey, Entitlements> = {
  free: {
    label: 'Free',
    priceMonthly: 0,
    canPostJobs: true,
    maxLiveJobs: 15,
    maxUsers: 10,
    maxFavourites: 1000,
    maxLists: 50,
    canInvite: true,
    complianceStatus: true,
    complianceAlerts: false,
    featuredJobs: false,
  },
  pro: {
    label: 'Pro',
    priceMonthly: 0, // not on sale yet
    canPostJobs: true,
    maxLiveJobs: 100,
    maxUsers: 50,
    maxFavourites: 5000,
    maxLists: 200,
    canInvite: true,
    complianceStatus: true,
    complianceAlerts: true,
    featuredJobs: true,
  },
};

/** What a company can do: its plan, plus anything switched on or off for it by hand in admin. */
export function entitlements(company: { plan: string; plan_overrides?: Record<string, unknown> | null }): Entitlements {
  const base = PLANS[(company.plan as PlanKey)] ?? PLANS.free;
  return { ...base, ...((company.plan_overrides ?? {}) as Partial<Entitlements>) };
}

export const VALUE_BANDS = [
  { key: 'under-25k', label: 'Under £25k' },
  { key: '25k-100k', label: '£25k to £100k' },
  { key: '100k-250k', label: '£100k to £250k' },
  { key: '250k-500k', label: '£250k to £500k' },
  { key: '500k-1m', label: '£500k to £1m' },
  { key: 'over-1m', label: 'Over £1m' },
];
export const valueBandLabel = (k: string | null | undefined) => VALUE_BANDS.find((v) => v.key === k)?.label ?? null;

/** Email domains that tell us nothing about the company. */
export const FREE_MAIL = /@(gmail|googlemail|hotmail|outlook|live|yahoo|ymail|icloud|me|mac|aol|btinternet|btopenworld|sky|virginmedia|talktalk|protonmail|proton|gmx|mail|zoho)\.[a-z.]+$/i;

export const domainOf = (s: string | null | undefined) => {
  if (!s) return null;
  const v = s.trim().toLowerCase();
  const host = v.includes('@') ? v.split('@').pop()! : v.replace(/^https?:\/\//, '').split('/')[0];
  return host.replace(/^www\./, '') || null;
};
