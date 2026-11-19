import Link from 'next/link';
import { db } from '@/lib/supabase';
import { tradeLabel } from '@/lib/config';
import { sectorLabel, type Job } from '@/lib/contractors';
import { valueBandLabel } from '@/lib/contractorPlans';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Member tenders | TLGB admin' };

const ukDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default async function AdminTenders() {
  const { data: cos } = await db().from('contractor_companies').select('id, name, business_id').not('business_id', 'is', null).limit(5000);
  const ids = (cos ?? []).map((c) => c.id as string);
  const { data: jobs } = ids.length
    ? await db().from('contractor_jobs').select('*').in('company_id', ids).in('status', ['pending', 'open', 'closed']).order('created_at', { ascending: false }).limit(200)
    : { data: [] as Job[] };
  const list = (jobs ?? []) as Job[];
  const name = (cid: string) => cos?.find((c) => c.id === cid)?.name ?? '';
  const bid = (cid: string) => cos?.find((c) => c.id === cid)?.business_id as string | undefined;
  const pending = list.filter((j) => j.status === 'pending');
  const rest = list.filter((j) => j.status !== 'pending');

  return (
    <div className="narrow wide">
      <p><Link href="/admin">&larr; Admin</Link></p>
      <h1>Member tenders</h1>
      <p className="muted">Tenders posted by members. Nothing goes to other members until you approve it here.</p>
      <h2>Waiting for approval ({pending.length})</h2>
      {!pending.length && <p className="muted">Nothing waiting.</p>}
      {pending.map((j) => (
        <div key={j.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 14, margin: '10px 0' }}>
          <h3 style={{ margin: 0 }}>{j.title}</h3>
          <p className="muted small">From <Link href={`/admin/${bid(j.company_id)}`}>{name(j.company_id)}</Link> &middot; {sectorLabel(j.sector)} &middot; {j.trades.map(tradeLabel).join(', ')} &middot; {j.town ? `${j.town}, ` : ''}{j.postcode}
            {valueBandLabel(j.value_band) ? ` · ${valueBandLabel(j.value_band)}` : ''}{j.return_date ? ` · reply by ${ukDate(j.return_date)}` : ''}</p>
          <p style={{ whiteSpace: 'pre-wrap' }}>{j.description}</p>
          {j.docs_url && <p><a href={j.docs_url} target="_blank" rel="noopener nofollow">Documents link</a></p>}
          <p className="muted small">Contact: {j.contact_name} ({j.contact_email})</p>
          <form method="post" action="/api/admin/tenders" style={{ display: 'inline' }}>
            <input type="hidden" name="id" value={j.id} /><input type="hidden" name="action" value="approve" />
            <button type="submit" className="primary">Approve and send to matching members</button>
          </form>
          <form method="post" action="/api/admin/tenders" style={{ display: 'inline-flex', gap: 6, marginLeft: 10 }}>
            <input type="hidden" name="id" value={j.id} /><input type="hidden" name="action" value="reject" />
            <input name="reason" placeholder="Reason (sent to them)" maxLength={500} />
            <button type="submit">Send back</button>
          </form>
        </div>
      ))}
      <h2>Live and closed ({rest.length})</h2>
      {rest.map((j) => (
        <p key={j.id}><Link href={`/jobs/${j.id}`}>{j.title}</Link> <span className="muted small">{name(j.company_id)} &middot; {sectorLabel(j.sector)} &middot; {j.status}{j.published_at ? ` · sent ${ukDate(j.published_at)} to ${j.notified_count}` : ''}</span>
          {j.status === 'open' && (
            <form method="post" action="/api/admin/contractors" style={{ display: 'inline', marginLeft: 8 }}>
              <input type="hidden" name="id" value={j.id} /><input type="hidden" name="action" value="job-remove" /><button type="submit">Take down</button>
            </form>
          )}
        </p>
      ))}
    </div>
  );
}
