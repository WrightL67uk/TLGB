import { notFound } from 'next/navigation';
import { loadByToken } from '@/lib/signing';
import SignForm from './SignForm';
import '../../sign.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign a document | The Little Green Book', robots: { index: false, follow: false } };

export default async function SignerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await loadByToken(token);
  if (!t) notFound();
  const { e, me } = t;

  return (
    <div className="narrow-in" style={{ maxWidth: 900, margin: '0 auto' }}>
      <h1>{e.title}</h1>
      <p className="muted">From {e.owner_email}. You are signing as <strong>{me.name}</strong> ({me.email}).</p>
      {e.message && <p className="panel" style={{ whiteSpace: 'pre-line' }}>{e.message}</p>}

      {e.status === 'completed' && (
        <>
          <p className="ok-box">Everyone has signed. The signed copy has been emailed to all signers.</p>
          <p><a className="btn primary" href={`/api/sign/doc/${token}?v=final`}>Download signed PDF</a></p>
        </>
      )}
      {e.status === 'sent' && me.status === 'signed' && <p className="ok-box">You signed this on {new Date(me.signed_at!).toLocaleString('en-GB', { timeZone: 'Europe/London', dateStyle: 'medium', timeStyle: 'short' })}. We will email everyone the signed copy once the others have signed.</p>}
      {(e.status === 'declined' || e.status === 'cancelled' || e.status === 'expired') && <p className="err">This document can no longer be signed ({e.status}). Ask the sender to send it again if you still need to sign.</p>}

      <p><a href={`/api/sign/doc/${token}`} target="_blank" rel="noopener">Open the document in a new tab</a></p>
      <iframe className="sign-frame" src={`/api/sign/doc/${token}${e.status === 'completed' ? '?v=final' : ''}`} title="Document to sign" />

      {e.status === 'sent' && me.status !== 'signed' && me.status !== 'declined' && <SignForm token={token} defaultName={me.name} />}
      <p className="muted small" style={{ marginTop: 24 }}>The Little Green Book only runs the signing. We did not write this document, we do not check it and we are not a party to it. Get your own advice if you are unsure. See our <a href="/legal/terms">terms</a>.</p>
    </div>
  );
}
