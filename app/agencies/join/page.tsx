import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAgency, PLACEMENT_TYPES, AGENCY_BODIES, getAgencyPlan } from '@/lib/agencies';
import { LEVELS } from '@/lib/seekerTypes';
import KeepForm from './KeepForm';
import AgencyExplainer from '../Explainer';
import '../../resources.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Recruitment agencies: post vacancies | The Little Green Book' };

export default async function AgencyJoin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getAgency()) redirect('/recruiter');
  const { error } = await searchParams;
  const plan = await getAgencyPlan();
  return (
    <div className="narrow">
      <h1>Recruitment agencies</h1>
      <p className="lead">Post landscaping and external works vacancies, search people looking for work, and bring your own candidates to the Book. You pay for the year when you sign up, we check your agency within 48 hours, and then you can post. If we cannot approve you, you are refunded in full.</p>
      <AgencyExplainer plan={plan} />
      <h2>Sign up</h2>
      <form id="agency-join" className="res-form" method="post" action="/api/agency/join">
        <KeepForm formId="agency-join" initialError={error} />
        <input type="text" name="tlgb_hp_zq" className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <label>Agency name<input name="name" required maxLength={120} autoComplete="organization" /></label>
        <div className="row">
          <label>Companies House number<input name="company_number" required maxLength={10} placeholder="e.g. 01234567" /></label>
          <label>Agency website<input name="website" required maxLength={200} placeholder="e.g. www.example.co.uk" /></label>
        </div>
        <div className="row">
          <label>Your name<input name="contact_name" required maxLength={120} autoComplete="name" /></label>
          <label>Job title<input name="job_title" maxLength={80} /></label>
        </div>
        <div className="row">
          <label>Work email<input name="email" type="email" required maxLength={200} autoComplete="email" /></label>
          <label>Phone<input name="phone" required maxLength={30} autoComplete="tel" /></label>
        </div>
        <p className="muted small" style={{ margin: 0 }}>Use your agency email address, on the same domain as your website. Gmail, Hotmail and similar take longer to check.</p>

        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend><b>Roles you place</b></legend>
          {LEVELS.map((o) => <label key={o.key} className="check" style={{ display: 'flex', fontWeight: 400 }}><input type="checkbox" name="roles" value={o.key} /><span>{o.label}</span></label>)}
        </fieldset>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend><b>What you place</b></legend>
          {PLACEMENT_TYPES.map((o) => <label key={o.key} className="check" style={{ display: 'flex', fontWeight: 400 }}><input type="checkbox" name="placement_types" value={o.key} /><span>{o.label}</span></label>)}
        </fieldset>
        <label>Areas you cover<input name="covers" required maxLength={300} placeholder="e.g. London and the South East" /></label>

        <div className="row">
          <label>Employers liability insurance runs to<input name="el_expiry" type="date" required /></label>
          <label>Public liability insurance runs to<input name="pl_expiry" type="date" required /></label>
        </div>
        <p className="muted small" style={{ margin: 0 }}>We may ask to see your certificates before approving you.</p>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend><b>Professional bodies <span className="muted small">(optional)</span></b></legend>
          {AGENCY_BODIES.map((o) => <label key={o.key} className="check" style={{ display: 'flex', fontWeight: 400 }}><input type="checkbox" name="memberships" value={o.key} /><span>{o.label}</span></label>)}
        </fieldset>
        <label>GLAA licence number <span className="muted small">(only if you supply horticultural labour)</span><input name="glaa_licence" maxLength={40} /></label>

        <label className="check" style={{ display: 'flex', fontWeight: 400 }}>
          <input type="checkbox" name="rtw" required />
          <span>We carry out right to work checks on the people we place and follow employment agency law.</span>
        </label>
        <label className="check" style={{ display: 'flex', fontWeight: 400 }}>
          <input type="checkbox" name="terms" required />
          <span>I work for this agency and can sign it up. I agree to the <Link href="/legal/terms" target="_blank">website terms</Link>, and I have read the <Link href="/legal/privacy" target="_blank">privacy notice</Link>.</span>
        </label>
        <p className="muted small" style={{ margin: 0 }}>Next you go to our secure payment page: £{plan.price} for the year, with {plan.credits} vacancy credits.</p>
        <button type="submit" className="primary">continue to payment</button>
      </form>
      <p className="muted small">Already registered? <Link href="/login?next=/recruiter">Log in</Link>. A landscaping business hiring directly? <Link href="/join">List your business</Link>.</p>
    </div>
  );
}
