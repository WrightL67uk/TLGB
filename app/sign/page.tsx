import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db } from '@/lib/supabase';
import { getSessionEmail } from '@/lib/session';
import { expireIfDue, type Envelope } from '@/lib/signing';
import './sign.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign documents | The Little Green Book' };

export default async function SignHome() {
  const email = await getSessionEmail();
  if (!email) redirect('/login?next=/sign');
  const { data } = await db().from('signing_envelopes').select('*').eq('owner_email', email).order('created_at', { ascending: false }).limit(100);
  const envs = await Promise.all(((data ?? []) as Envelope[]).map(expireIfDue));
  const ids = envs.map((e) => e.id);
  const { data: sg } = ids.length ? await db().from('signing_signers').select('envelope_id, status').in('envelope_id', ids) : { data: [] };
  const counts = new Map<string, { signed: number; total: number }>();
  for (const s of sg ?? []) { const c = counts.get(s.envelope_id) ?? { signed: 0, total: 0 }; c.total++; if (s.status === 'signed') c.signed++; counts.set(s.envelope_id, c); }

  return (
    <div className="narrow">
      <h1>Sign documents</h1>
      <p className="lead">Upload your own contract or agreement as a PDF, say who needs to sign, and we email each of them a private link. When everyone has signed, all of you get the signed PDF with a certificate showing who signed and when.</p>
      <p><Link href="/sign/new" className="btn primary">Send a document for signing</Link></p>
      <p className="muted small">We only run the signing. We do not write or check your document and we are not a party to it. See the <Link href="/legal/terms">website terms</Link>.</p>

      <h2>Your documents</h2>
      {envs.length === 0 && <p className="muted">Nothing sent yet.</p>}
      {envs.length > 0 && (
        <table className="table">
          <thead><tr><th>Document</th><th>Sent</th><th>Signed</th><th>Status</th></tr></thead>
          <tbody>
            {envs.map((e) => (
              <tr key={e.id}>
                <td><Link href={`/sign/${e.id}`}>{e.title}</Link></td>
                <td>{new Date(e.created_at).toLocaleDateString('en-GB')}</td>
                <td>{counts.get(e.id)?.signed ?? 0} of {counts.get(e.id)?.total ?? 0}</td>
                <td><span className={`sign-status ${e.status}`}>{e.status === 'sent' ? 'waiting' : e.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
