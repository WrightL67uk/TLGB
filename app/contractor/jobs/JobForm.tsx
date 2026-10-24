import { TRADES, ACCREDITATION_LIST, PL_COVER_OPTIONS } from '@/lib/config';
import { VALUE_BANDS } from '@/lib/contractorPlans';
import type { Job } from '@/lib/contractors';

/** The post and edit form for a job. Plain HTML form, posted to /api/contractor/job. */
export default function JobForm({ job, contact, error }: { job?: Job; contact: { name: string; email: string }; error?: string }) {
  const j = job;
  return (
    <form className="res-form" method="post" action="/api/contractor/job">
      {error && <p className="err big">{error}</p>}
      {j && <input type="hidden" name="id" value={j.id} />}
      <label>Job title<input name="title" required maxLength={140} defaultValue={j?.title} placeholder="e.g. Soft landscaping package, 120 homes, Hitchin" /></label>
      <label>What the package includes
        <textarea name="description" required maxLength={6000} defaultValue={j?.description} style={{ minHeight: 160 }}
          placeholder="Scope, quantities, programme, site conditions, how you want it priced (schedule of rates, lump sum), payment terms and retention" />
      </label>
      <div>
        <strong>Which trades?</strong>
        <div className="checks">
          {TRADES.map((t) => (
            <label key={t.slug}><input type="checkbox" name="trades" value={t.slug} defaultChecked={j?.trades.includes(t.slug)} /> {t.label}</label>
          ))}
        </div>
      </div>
      <div className="row">
        <label>Site postcode<input name="postcode" required maxLength={10} defaultValue={j?.postcode} /></label>
        <label>Town (shown to trades)<input name="town" maxLength={80} defaultValue={j?.town ?? ''} /></label>
        <label>Rough value
          <select name="value_band" defaultValue={j?.value_band ?? ''}>
            <option value="">Prefer not to say</option>
            {VALUE_BANDS.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}
          </select>
        </label>
      </div>
      <div className="row">
        <label>Start on site (approx.)<input name="start_date" type="date" defaultValue={j?.start_date ?? ''} /></label>
        <label>Replies or prices by<input name="return_date" type="date" defaultValue={j?.return_date ?? ''} /></label>
        <label>Minimum public liability
          <select name="min_pl" defaultValue={j?.min_pl ? String(j.min_pl) : ''}>
            <option value="">No minimum</option>
            {PL_COVER_OPTIONS.map((n) => <option key={n} value={n}>£{n / 1_000_000}m</option>)}
          </select>
        </label>
      </div>
      <details open={!!j?.accreditations.length}>
        <summary><strong>Accreditations you require</strong> <span className="muted small">(only trades who hold all of these are emailed)</span></summary>
        <div className="checks" style={{ marginTop: 8 }}>
          {ACCREDITATION_LIST.map((a) => (
            <label key={a.key}><input type="checkbox" name="accreditations" value={a.key} defaultChecked={j?.accreditations.includes(a.key)} /> {a.label}</label>
          ))}
        </div>
      </details>
      <label>Link to drawings and tender documents (optional)
        <input name="docs_url" maxLength={500} defaultValue={j?.docs_url ?? ''} placeholder="e.g. a SharePoint, Dropbox or portal link" />
      </label>
      <div className="row">
        <label>Contact name<input name="contact_name" required maxLength={120} defaultValue={j?.contact_name ?? contact.name} /></label>
        <label>Contact email<input name="contact_email" type="email" required maxLength={200} defaultValue={j?.contact_email ?? contact.email} /></label>
      </div>
      <p className="muted small" style={{ margin: 0 }}>You can upload drawings on the next page. Nothing is sent to trades until you press &ldquo;Send to matching trades&rdquo;.</p>
      <button type="submit" className="primary">{j ? 'save changes' : 'save and continue'}</button>
    </form>
  );
}
