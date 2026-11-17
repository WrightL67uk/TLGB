import 'server-only';
import { db } from './supabase';
import { settleReferralCredits } from './agencies';
import { FREE_MAIL, domainOf } from './contractorPlans';

/** A job seeker who came through an agency's link counts towards the agency's credits once their profile is approved. */
export async function countAgencyReferral(seekerId: string, seekerEmail: string) {
  const { data: s } = await db().from('job_seekers').select('referred_by_agency').eq('id', seekerId).maybeSingle();
  if (!s?.referred_by_agency) return;
  const { data: a } = await db().from('agencies').select('id, status, email_domain, referrals_per_credit, referral_monthly_cap').eq('id', s.referred_by_agency).maybeSingle();
  if (!a || a.status !== 'approved') return;
  // The agency's own staff do not count
  const seekerDomain = domainOf(seekerEmail);
  if (seekerDomain && !FREE_MAIL.test(seekerEmail) && a.email_domain && seekerDomain === a.email_domain) return;
  await db().from('agency_referrals').upsert({ agency_id: a.id, seeker_id: seekerId }, { onConflict: 'seeker_id', ignoreDuplicates: true });
  await settleReferralCredits(a);
}
