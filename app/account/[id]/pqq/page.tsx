import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ownedBusiness } from '@/lib/account';
import { isPaid } from '@/lib/membership';
import { loadPqq, autoAnswers } from '@/lib/pqqServer';
import PqqManager from './PqqManager';
import '../../../compliance.css';
import '../../../pqq.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'PQQ answer bank | TLGB' };

export default async function PqqPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const own = await ownedBusiness(id);
  if (!own.ok) {
    if (own.status === 401) redirect(`/login?next=/account/${id}/pqq`);
    notFound();
  }
  const b = own.business;

  if (!isPaid(b)) {
    return (
      <div className="narrow cp">
        <p className="small"><Link href={`/account/${b.id}`}>Back to my listing</Link></p>
        <h1>PQQ answer bank</h1>
        <p className="lead">Save your answers to the questions every prequalification questionnaire and supplier portal asks, and reuse them in seconds.</p>
        <div className="panel">
          <p>The answer bank is included with every paid membership.</p>
          {b.status === 'approved' && <Link href={`/account/${b.id}`} className="sq sq-rust">Start membership</Link>}
        </div>
      </div>
    );
  }

  const [{ answers, projects }, auto] = await Promise.all([loadPqq(b.id), autoAnswers(b)]);
  return (
    <div className="narrow cp pq">
      <p className="small"><Link href={`/account/${b.id}`}>Back to my listing</Link> · <Link href={`/account/${b.id}/compliance`}>Compliance pack</Link></p>
      <PqqManager businessId={b.id} tradingName={b.trading_name} answers={answers} projects={projects} auto={auto} />
    </div>
  );
}
