import type { PayJob } from '@/lib/payments';

/** Job details and payment terms, used on the add and edit forms. */
export default function TermsFields({ j }: { j?: PayJob }) {
  return (
    <>
      <div className="row">
        <label>Job name<input name="name" required maxLength={120} defaultValue={j?.name} placeholder="e.g. Croft Gardens, Knebworth" /></label>
        <label>Main contractor<input name="contractor" required maxLength={120} defaultValue={j?.contractor} /></label>
      </div>
      <div className="row">
        <label>Their contact (for letters)<input name="contractor_contact" maxLength={120} defaultValue={j?.contractor_contact ?? ''} placeholder="e.g. Commercial Manager" /></label>
        <label>Order or subcontract ref.<input name="contract_ref" maxLength={60} defaultValue={j?.contract_ref ?? ''} /></label>
        <label>Subcontract sum £<input name="contract_sum" inputMode="decimal" defaultValue={j?.contract_sum ?? ''} /></label>
      </div>
      <label>Their address (for letters)<textarea name="contractor_address" maxLength={300} rows={2} defaultValue={j?.contractor_address ?? ''} /></label>
      <fieldset style={{ border: '1px solid var(--line)', padding: 10 }}>
        <legend><strong>Payment terms</strong></legend>
        <label className="chk" style={{ display: 'flex', gap: 8, fontWeight: 400 }}><input type="radio" name="terms" value="custom" defaultChecked={j ? j.terms === 'custom' : true} /> Use the dates in my subcontract</label>
        <label className="chk" style={{ display: 'flex', gap: 8, fontWeight: 400 }}><input type="radio" name="terms" value="scheme" defaultChecked={j?.terms === 'scheme'} /> No payment terms, or they do not comply: use the Scheme (due 7 days after the period end, final date 17 days later)</label>
        <div className="row" style={{ marginTop: 8 }}>
          <label>Due date: days after application<input name="due_days" type="number" min={0} max={120} defaultValue={j?.due_days ?? 0} /></label>
          <label>Final date: days after due date<input name="final_days" type="number" min={0} max={120} defaultValue={j?.final_days ?? 30} /></label>
          <label>Payment notice: days after due date<input name="notice_days" type="number" min={0} max={60} defaultValue={j?.notice_days ?? 5} /></label>
          <label>Pay less notice: days before final date<input name="payless_days" type="number" min={0} max={60} defaultValue={j?.payless_days ?? 7} /></label>
        </div>
        <label className="chk" style={{ display: 'flex', gap: 8, fontWeight: 400, marginTop: 6 }}><input type="checkbox" name="exclude_holidays" defaultChecked={j ? j.exclude_holidays : true} /> Leave out Christmas Day, Good Friday and bank holidays when counting</label>
      </fieldset>
      <fieldset style={{ border: '1px solid var(--line)', padding: 10 }}>
        <legend><strong>Retention</strong></legend>
        <div className="row">
          <label>Retention %<input name="retention_pct" inputMode="decimal" defaultValue={j?.retention_pct ?? 5} /></label>
          <label>Released at practical completion %<input name="first_release_pct" inputMode="decimal" defaultValue={j?.first_release_pct ?? 50} /></label>
          <label>Defects period (months)<input name="dlp_months" type="number" min={0} max={60} defaultValue={j?.dlp_months ?? 12} /></label>
          <label>Practical completion date<input name="pc_date" type="date" defaultValue={j?.pc_date ?? ''} /></label>
        </div>
        <label>Retention held £ (leave blank to work it out from your latest gross valuation)<input name="retention_override" inputMode="decimal" defaultValue={j?.retention_override ?? ''} /></label>
      </fieldset>
      <label>Notes<textarea name="notes" maxLength={2000} rows={2} defaultValue={j?.notes ?? ''} /></label>
    </>
  );
}
