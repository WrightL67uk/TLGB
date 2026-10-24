import Link from 'next/link';
import type { Metadata } from 'next';
import { openPack, logPackEvent, type PackDoc } from '@/lib/compliance';
import { getSessionEmail } from '@/lib/session';
import { unverifiedReason } from '@/lib/membership';
import { tradeLabel } from '@/lib/config';
import { CATEGORIES, docType, shownStatus, ukDate } from '@/lib/complianceTypes';
import DownloadAll from './DownloadAll';
import { loadPqq, autoAnswers } from '@/lib/pqqServer';
import { answerBlocks, money, projectDates } from '@/lib/pqqRender';
import '../../compliance.css';
import '../../pqq.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Compliance pack | The Little Green Book',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

const REASONS = {
  missing: { h: 'Link not found', p: 'Check the link you were sent. It may have been copied incompletely.' },
  off: { h: 'This link has been switched off', p: 'It has expired or the business has stopped sharing it. Ask them for a new link.' },
  unavailable: { h: 'This pack is not available at the moment', p: 'Ask the business for an up to date copy of their documents.' },
};

function dateLine(d: PackDoc) {
  if (d.expiry) {
    const s = shownStatus(d, true);
    return s.key === 'expired' ? `Expired ${ukDate(d.expiry)}` : `In date until ${ukDate(d.expiry)}`;
  }
  return d.reviewed_on ? `Last reviewed ${ukDate(d.reviewed_on)}` : '';
}

export default async function PackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const pack = await openPack(token);

  if (!pack.ok) {
    const r = REASONS[pack.reason];
    return (
      <div className="narrow pk-gone">
        <h1>{r.h}</h1>
        <p className="lead">{r.p}</p>
        <p><Link href="/">The Little Green Book</Link></p>
      </div>
    );
  }

  const { link, business: b, docs } = pack;
  if ((await getSessionEmail()) !== b.email) await logPackEvent(link, 'open');
  const verified = unverifiedReason(b) === null;
  const area = b.base_postcode?.split(' ')[0]?.toUpperCase();
  const showProfile = link.include.includes('profile');
  const pqq = showProfile ? await loadPqq(b.id) : null;
  const blocks = pqq ? answerBlocks(pqq.answers, await autoAnswers(b), { finance: link.include.includes('finance') }) : [];
  const profileSections = [...new Set(blocks.map((x) => x.section))];
  const groups = CATEGORIES
    .map((c) => ({ ...c, docs: docs.filter((d) => docType(d.doc_type)?.category === c.key) }))
    .filter((g) => g.docs.length);

  return (
    <div className="pk">
      <header className="pk-head">
        <div>
          <h1>{b.trading_name}</h1>
          <p>
            {b.trades.slice(0, 4).map(tradeLabel).join(', ')}
            {area && <> · Based in {area}, covers {b.radius_miles} miles</>}
            {b.business_type === 'ltd' && b.company_number && <> · Company {b.company_number}</>}
          </p>
        </div>
        {verified
          ? <Link href={`/b/${b.id}`} className="pk-verified">Verified member</Link>
          : <span className="pk-unverified">Unverified</span>}
      </header>

      <div className="pk-bar">
        <p className="muted small">Prepared for <strong>{link.label}</strong>. This page always shows the latest versions of each document.</p>
        <DownloadAll token={token} count={docs.length} />
      </div>

      {groups.length === 0 && !showProfile && <p className="panel muted">There are no documents on this link yet.</p>}

      {groups.map((g) => (
        <section key={g.key} className="pk-group">
          <h2>{g.label}</h2>
          {g.docs.map((d) => {
            const s = shownStatus(d, true);
            return (
              <div key={d.id} className={`pk-row st-${s.key}`}>
                <div className="pk-doc">
                  <strong>{d.title}</strong>
                  <span>{dateLine(d)}</span>
                </div>
                <span className={`pk-pill p-${s.key === 'expired' ? 'expired' : d.status === 'checked' ? 'checked' : 'own'}`}>
                  {s.key === 'expired' ? 'Expired' : d.status === 'checked' ? 'Checked by TLGB' : 'Provided by member'}
                </span>
                <a className="pk-btn" href={`/api/pack/${encodeURIComponent(token)}/file/${d.id}`}>Download</a>
              </div>
            );
          })}
        </section>
      ))}

      {showProfile && (blocks.length > 0 || (pqq?.projects.length ?? 0) > 0) && (
        <section className="pk-group pk-profile">
          <h2>Company profile</h2>
          {profileSections.map((sec) => (
            <div key={sec}>
              <h3 className="pk-sub">{sec}</h3>
              {blocks.filter((x) => x.section === sec).map((x, i) => (
                <div key={i} className="pk-a">
                  <strong>{x.q}</strong>
                  {x.kind === 'yesno' && <p><b>{x.yes ? 'Yes' : 'No'}</b>{x.text ? `. ${x.text}` : ''}</p>}
                  {x.kind === 'text' && <p>{x.text}</p>}
                  {x.kind === 'figures' && x.table && (
                    <div className="cp-table-wrap"><table><thead><tr>{x.table.head.map((h, j) => <th key={j}>{h}</th>)}</tr></thead>
                      <tbody>{x.table.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{c}</td>)}</tr>)}</tbody></table></div>
                  )}
                </div>
              ))}
            </div>
          ))}
          {(pqq?.projects.length ?? 0) > 0 && (
            <div>
              <h3 className="pk-sub">Project references</h3>
              {pqq!.projects.map((p) => (
                <div key={p.id} className="pk-a">
                  <strong>{p.title}</strong>
                  <p>{[p.client && `Client: ${p.client}`, p.location, p.value_gbp != null ? `Value ${money(p.value_gbp)}` : null, projectDates(p)].filter(Boolean).join(' · ')}</p>
                  {p.scope && <p>{p.scope}</p>}
                  {p.outcome && <p>{p.outcome}</p>}
                  {p.share_reference && p.ref_name && <p className="muted small">Reference: {[p.ref_name, p.ref_role, p.ref_email, p.ref_phone].filter(Boolean).join(', ')}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="pk-foot">
        <p><strong>What the labels mean.</strong> <em>Checked by TLGB</em>: we have checked the certificate by hand. <em>Provided by member</em>: the business&apos;s own document, which we have not reviewed.</p>
        <p className="muted small">Shared through <Link href="/">The Little Green Book</Link>, the directory of checked landscaping and external works trades.</p>
      </section>
    </div>
  );
}
