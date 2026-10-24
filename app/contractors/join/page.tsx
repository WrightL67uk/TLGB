import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getContractor } from '@/lib/contractors';
import '../../resources.css';
import '../../contractor.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Create a contractor account | The Little Green Book' };

export default async function ContractorJoin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getContractor()) redirect('/contractor');
  const { error } = await searchParams;
  return (
    <div className="narrow">
      <h1>Create a free contractor account</h1>
      <p className="lead">For main contractors, housebuilders and developers. We check your company before you can post jobs, usually within one working day.</p>
      <form className="res-form" method="post" action="/api/contractor/join">
        {error && <p className="err big">{error}</p>}
        <input type="text" name="tlgb_hp_zq" className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <label>Company name<input name="name" required maxLength={120} autoComplete="organization" /></label>
        <div className="row">
          <label>Companies House number<input name="company_number" required maxLength={10} placeholder="e.g. 01234567" /></label>
          <label>Company website<input name="website" required maxLength={200} placeholder="e.g. www.example.co.uk" /></label>
        </div>
        <div className="row">
          <label>Your name<input name="user_name" required maxLength={120} autoComplete="name" /></label>
          <label>Job title<input name="job_title" maxLength={80} placeholder="e.g. Buyer, Package Manager" /></label>
        </div>
        <div className="row">
          <label>Work email<input name="email" type="email" required maxLength={200} autoComplete="email" /></label>
          <label>Phone<input name="phone" required maxLength={30} autoComplete="tel" /></label>
        </div>
        <p className="muted small" style={{ margin: 0 }}>Use your company email address. Accounts on Gmail, Hotmail and similar take longer to check.</p>
        <label className="check" style={{ display: 'flex', fontWeight: 400 }}>
          <input type="checkbox" name="terms" required />
          <span>I work for this company and can sign it up. I agree to the <Link href="/legal/terms" target="_blank">website terms</Link> and <Link href="/legal/contractor-terms" target="_blank">contractor terms</Link>, and I have read the <Link href="/legal/privacy" target="_blank">privacy notice</Link>.</span>
        </label>
        <button type="submit" className="primary">create my account</button>
      </form>
      <p className="muted small">Already registered? <Link href="/login?next=/contractor">Log in</Link>. A subcontractor? <Link href="/join">List your business</Link>.</p>
    </div>
  );
}
