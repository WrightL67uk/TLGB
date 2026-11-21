import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ownedBusiness } from '@/lib/account';
import { isPaid } from '@/lib/membership';
import { badgeCode, BADGE_PATH, BADGE_JPG_PATH, BADGE_W, BADGE_H } from '@/lib/badge';
import CopyCode from './CopyCode';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your verified badge | TLGB' };

/** The verified member badge and the code to put it on the member's own website. */
export default async function BadgePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const own = await ownedBusiness(id);
  if (!own.ok) redirect(`/login?next=/account/${id}/badge`);
  const b = own.business;
  const ok = b.status === 'approved' && isPaid(b);
  return (
    <div className="narrow">
      <p className="small"><Link href={`/account/${b.id}`}>Back to my listing</Link></p>
      <h1>Your verified member badge</h1>
      {!ok ? (
        <p className="warn">The badge is for verified members. <Link href={`/account/${b.id}/plan`}>Go verified</Link> to use it.</p>
      ) : (
        <>
          <p className="lead">Show customers and contractors that {b.trading_name} has been checked. Put the badge on your website, quotes and email signature.</p>
          <p><img src={BADGE_PATH} alt="Verified member of The Little Green Book" width={BADGE_W} height={BADGE_H} /></p>
          <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href={BADGE_PATH} download="tlgb-verified-member.png" className="sq">Download PNG</a>
            <a href={BADGE_JPG_PATH} download="tlgb-verified-member.jpg" className="sq">Download JPG</a>
          </p>
          <h2>Add it to your website</h2>
          <p>Paste this code where you want the badge to show, or send it to whoever looks after your website. It shows the badge and links it to your TLGB listing, so visitors can see your checks for themselves.</p>
          <CopyCode code={badgeCode(b.id)} />
          <p className="muted small" style={{ marginTop: 12 }}>Please only show the badge while you are a verified member.</p>
        </>
      )}
    </div>
  );
}
