import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/supabase';
import { ownedBusiness } from '@/lib/account';
import { isPaid } from '@/lib/membership';
import { currentDocs, type PackLink } from '@/lib/compliance';
import { siteUrl } from '@/lib/config';
import PackManager from './PackManager';
import '../../../compliance.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Compliance pack | TLGB' };

const KIND: Record<string, string> = { open: 'Opened', download: 'Downloaded', zip: 'Downloaded all' };

export default async function CompliancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const own = await ownedBusiness(id);
  if (!own.ok) {
    if (own.status === 401) redirect(`/login?next=/account/${id}/compliance`);
    notFound();
  }
  const b = own.business;

  if (!isPaid(b)) {
    return (
      <div className="narrow cp">
        <p className="small"><Link href={`/account/${b.id}`}>Back to my listing</Link></p>
        <h1>Compliance pack</h1>
        <p className="lead">Keep your insurance, accreditations, RAMS and policies in one place and send contractors a single link instead of filling in another portal.</p>
        <div className="panel">
          <p>The compliance pack is included with every paid membership.</p>
          {b.status === 'approved'
            ? <Link href={`/account/${b.id}`} className="sq sq-rust">Start membership</Link>
            : <p className="muted">It becomes available once your listing is approved and your membership has started.</p>}
        </div>
      </div>
    );
  }

  const [docs, { data: links }, { data: events }] = await Promise.all([
    currentDocs(b.id),
    db().from('pack_links').select('*').eq('business_id', b.id).order('created_at', { ascending: false }).limit(200),
    db().from('pack_events').select('kind, detail, created_at, link_id').eq('business_id', b.id).order('created_at', { ascending: false }).limit(40),
  ]);
  const linkList = (links ?? []) as PackLink[];
  const labelOf = new Map(linkList.map((l) => [l.id, l.label]));

  return (
    <div className="narrow cp">
      <p className="small"><Link href={`/account/${b.id}`}>Back to my listing</Link></p>
      <PackManager
        businessId={b.id}
        tradingName={b.trading_name}
        docs={docs.map((d) => ({
          id: d.id, doc_type: d.doc_type, title: d.title, file_name: d.file_name, size: d.size_bytes,
          expiry: d.expiry, reviewed_on: d.reviewed_on, status: d.status, reject_reason: d.reject_reason,
          replaces: d.replaces, created_at: d.created_at,
        }))}
        links={linkList.map((l) => ({
          id: l.id, label: l.label, url: `${siteUrl()}/pack/${l.token}`, include: l.include,
          expires_at: l.expires_at, revoked_at: l.revoked_at, open_count: l.open_count, created_at: l.created_at,
        }))}
        events={(events ?? []).map((e) => ({
          when: e.created_at as string,
          link: labelOf.get(e.link_id as string) ?? 'Deleted link',
          what: `${KIND[e.kind as string] ?? e.kind}${e.detail ? `: ${e.detail}` : ''}`,
        }))}
      />
    </div>
  );
}
