import 'server-only';
import { db } from './supabase';
import { tradeLabel, gbp, accreditationLabel } from './config';
import { currentDocs } from './compliance';
import { daysTo, ukDate } from './complianceTypes';
import type { Business } from './account';
import type { Answer, Project } from './pqq';

export async function loadPqq(businessId: string) {
  const [{ data: answers }, { data: projects }] = await Promise.all([
    db().from('pqq_answers').select('key, short_text, long_text, data, updated_at').eq('business_id', businessId),
    db().from('pqq_projects').select('*').eq('business_id', businessId).order('end_date', { ascending: false, nullsFirst: true }),
  ]);
  return { answers: (answers ?? []) as Answer[], projects: (projects ?? []) as Project[] };
}

/** Answers that come straight from the listing and compliance pack, so nothing is typed twice. */
export async function autoAnswers(b: Business): Promise<Record<string, string>> {
  const docs = (await currentDocs(b.id)).filter((d) => d.status === 'checked' || d.status === 'provided');
  const live = (t: string) => docs.filter((d) => d.doc_type === t && (!d.expiry || daysTo(d.expiry) >= 0));
  const ins = (label: string, t: string, cover?: number | null) => {
    const d = live(t)[0];
    if (!d && !cover) return null;
    return `${label}: ${cover ? gbp(cover) : 'held'}${d?.expiry ? `, expires ${ukDate(d.expiry)}` : ''}${d?.status === 'checked' ? ' (certificate checked by The Little Green Book)' : ''}.`;
  };
  const accreds = [...new Set([
    ...b.accreditations.map(accreditationLabel),
    ...live('accreditation').map((d) => d.title),
  ])];
  const has = (re: RegExp) => accreds.filter((a) => re.test(a));
  const ssip = has(/CHAS|SMAS|SafeContractor|Constructionline|Acclaim|Avetta|ISO 45001/i);
  const iso14 = has(/14001|EMAS/i);
  const iso9 = has(/9001/i);
  const area = b.base_postcode?.split(' ')[0]?.toUpperCase();

  return {
    co_identity: [
      b.trading_name,
      b.business_type === 'ltd' && b.company_number ? `Company number ${b.company_number}` : 'Sole trader',
      b.business_address ? `Address: ${b.business_address}` : null,
    ].filter(Boolean).join('\n'),
    co_trades: `${b.trades.map(tradeLabel).join(', ')}. Based in ${area}, covering up to ${b.radius_miles} miles.`,
    ins_cover: [
      ins('Public liability', 'pl', b.pl_cover_amount),
      ins('Employers liability', 'el', b.el_cover_amount),
      ins('Professional indemnity', 'pi'),
    ].filter(Boolean).join('\n') || 'Add your insurance certificates to your compliance pack.',
    hs_cert: ssip.length ? `Yes: ${ssip.join(', ')}.` : 'Not yet. Add your accreditations to your listing or compliance pack.',
    env_cert: iso14.length ? `Yes: ${iso14.join(', ')}.` : 'No, we do not currently hold ISO 14001. Our environmental policy and arrangements are described below.',
    q_cert: iso9.length ? `Yes: ${iso9.join(', ')}.` : 'No, we do not currently hold ISO 9001. Our quality arrangements are described below.',
  };
}
