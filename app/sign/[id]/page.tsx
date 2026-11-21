import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/supabase';
import { getSessionEmail } from '@/lib/session';
import { loadEnvelope } from '@/lib/signing';
import '../sign.css';

export const dynamic = 'force-dynamic';

const when = (iso: string | null) => iso ? new Date(iso).toLocaleString('en-GB', { timeZone: 'Europe/London', dateStyle: 'medium', timeStyle: 'short' }) : '';

export default async function SignDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string }> }) {
  const { id } = await params;
  const { msg } = await searchParams;
  const email = await getSessionEmail();
  if (!email) redirect(`/login?next=/sign/${id}`);
  const env = await loadEnvelope(id);
  if (!env || env.e.owner_email !== email) notFound();
  const { e, signers } = env;
  const { data: events } = await db().from('signing_events').select('created_at, action, detail, signer_id').eq('envelope_id', id).order('created_at');

  return (
    <div className="narrow">
      <p><Link href="/sign">&larr; All documents</Link></p>
      <h1>{e.title}</h1>
      {msg && <p className="ok-box">{msg}</p>}
      <p><span className={`sign-status ${e.status}`}>{e.status === 'sent' ? 'waiting for signatures' : e.status}</span> <span className="muted small">Sent {when(e.created_at)}{e.status === 'sent' ? `, expires ${when(e.expires_at)}` : ''}</span></p>

      <h2>Signers</h2>
      <table className="table">
        <thead><tr><th>Name</th><th>Status</th><th>When</th></tr></thead>
        <tbody>
          {signers.map((s) => (
            <tr key={s.id}>
              <td>{s.name}<br /><span className="muted small">{s.email}</span></td>
              <td><span className={`sign-status ${s.status}`}>{s.status === 'waiting' ? 'not opened' : s.status}</span></td>
              <td className="small">{s.status === 'signed' ? when(s.signed_at) : s.status === 'declined' ? `${when(s.signed_at ?? null)} ${s.decline_reason ?? ''}` : s.viewed_at ? `opened ${when(s.viewed_at)}` : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {e.status === 'completed' && <a className="btn primary" href={`/api/sign/owner/${e.id}?v=final`}>Download signed PDF</a>}
        <a className="btn" href={`/api/sign/owner/${e.id}`}>Download original</a>
      </p>
      {e.status === 'sent' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <form action="/api/sign/manage" method="post"><input type="hidden" name="id" value={e.id} /><input type="hidden" name="action" value="remind" /><button type="submit">Remind people who have not signed</button></form>
          <form action="/api/sign/manage" method="post"><input type="hidden" name="id" value={e.id} /><input type="hidden" name="action" value="cancel" /><button type="submit" className="danger">Cancel</button></form>
        </div>
      )}
      {(e.status === 'declined' || e.status === 'expired' || e.status === 'cancelled') && <p><Link href="/sign/new">Send a new version</Link></p>}

      <h2>Activity</h2>
      <ul className="small">
        {(events ?? []).map((ev, i) => <li key={i}>{when(ev.created_at)}: {ev.action}{ev.signer_id ? ` (${signers.find((s) => s.id === ev.signer_id)?.name ?? ''})` : ''}{ev.detail ? `. ${ev.detail}` : ''}</li>)}
      </ul>
    </div>
  );
}
