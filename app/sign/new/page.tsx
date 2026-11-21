import { redirect } from 'next/navigation';
import { getSessionEmail } from '@/lib/session';
import NewForm from './NewForm';
import '../sign.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Send a document for signing | The Little Green Book' };

export default async function NewSign() {
  const email = await getSessionEmail();
  if (!email) redirect('/login?next=/sign/new');
  return (
    <div className="narrow">
      <h1>Send a document for signing</h1>
      <p className="muted">PDF only (in Word, choose Save as PDF). Up to 15 MB. Each signer gets a private link that works for 30 days. We add a signature page and a certificate to the end of your PDF.</p>
      <NewForm me={email} />
    </div>
  );
}
