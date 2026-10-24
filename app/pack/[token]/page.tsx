import Link from 'next/link';
import type { Metadata } from 'next';
import { openPack, logPackEvent, type PackDoc } from '@/lib/compliance';
import { getSessionEmail } from '@/lib/session';
import { unverifiedReason } from '@/lib/membership';
import { tradeLabel } from '@/lib/config';
import { CATEGORIES, docType, shownStatus, ukDate } from '@/lib/complianceTypes';
import DownloadAll from './DownloadAll';
import '../../compliance.css';

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

      {groups.length === 0 && <p className="panel muted">There are no documents on this link yet.</p>}

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

      <section className="pk-foot">
        <p><strong>What the labels mean.</strong> <em>Checked by TLGB</em>: we have checked the certificate by hand. <em>Provided by member</em>: the business&apos;s own document, which we have not reviewed.</p>
        <p className="muted small">Shared through <Link href="/">The Little Green Book</Link>, the directory of checked landscaping and external works trades.</p>
      </section>
    </div>
  );
}
