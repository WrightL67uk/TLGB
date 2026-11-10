'use client';

import { useEffect, useRef, useState } from 'react';
import { uploadToSignedUrl } from '@/lib/supabaseBrowser';
import AccreditationPicker, { readAccreditationExpiries } from '@/app/AccreditationPicker';
import { TRADES, PL_COVER_OPTIONS, MAX_PHOTOS, gbp } from '@/lib/config';

type FileField = 'letterhead' | 'pl_certificate' | 'el_certificate' | 'accreditation_docs' | 'photos';
export type Saved = Record<string, string | string[] | Record<string, string> | undefined>;

type Props = {
  id: string;
  businessType: 'ltd' | 'sole_trader';
  company: { name: string; number: string; address: string } | null;
  email: string;
  saved: Saved;
};

const str = (v: Saved[string]) => (typeof v === 'string' ? v : '');
const arr = (v: Saved[string]) => (Array.isArray(v) ? v : []);

/** Step 3: everything else. Answers save as they type; files go up when they press Send for approval. */
export default function DetailsForm({ id, businessType, company, email, saved }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  function collect(fd: FormData): Saved {
    return {
      trading_name: String(fd.get('trading_name') ?? ''),
      owner_full_name: String(fd.get('owner_full_name') ?? ''),
      business_address: String(fd.get('business_address') ?? ''),
      contact_name: String(fd.get('contact_name') ?? ''),
      phone: String(fd.get('phone') ?? ''),
      website: String(fd.get('website') ?? ''),
      trades: fd.getAll('trades').map(String),
      base_postcode: String(fd.get('base_postcode') ?? ''),
      radius_miles: String(fd.get('radius_miles') ?? ''),
      pl_cover_amount: String(fd.get('pl_cover_amount') ?? ''),
      pl_expiry: String(fd.get('pl_expiry') ?? ''),
      el_cover_amount: String(fd.get('el_cover_amount') ?? ''),
      el_expiry: String(fd.get('el_expiry') ?? ''),
      accreditations: fd.getAll('accreditations').map(String),
      accreditation_expiries: readAccreditationExpiries(fd),
      description: String(fd.get('description') ?? ''),
    };
  }

  async function autosave() {
    if (!formRef.current) return;
    setSaveState('saving');
    try {
      const r = await fetch('/api/listing/autosave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, data: collect(new FormData(formRef.current)) }),
      }).then((x) => x.json());
      setSaveState(r.ok ? 'saved' : 'error');
    } catch {
      setSaveState('error');
    }
  }

  // Save a moment after they stop typing, and when they leave the page
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const onEdit = (e: Event) => {
      if ((e.target as HTMLInputElement).type === 'file') return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(autosave, 1200);
    };
    const onHide = () => { if (document.visibilityState === 'hidden') autosave(); };
    form.addEventListener('input', onEdit);
    form.addEventListener('change', onEdit);
    document.addEventListener('visibilitychange', onHide);
    return () => { form.removeEventListener('input', onEdit); form.removeEventListener('change', onEdit); document.removeEventListener('visibilitychange', onHide); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const fileFields: FileField[] = ['letterhead', 'pl_certificate', 'el_certificate', 'accreditation_docs', 'photos'];
    const files: { field: FileField; file: File }[] = [];
    for (const field of fileFields) for (const f of fd.getAll(field)) if (f instanceof File && f.size > 0) files.push({ field, file: f });
    if (files.filter((f) => f.field === 'photos').length > MAX_PHOTOS) return setError(`Up to ${MAX_PHOTOS} photos please.`);

    const s = collect(fd);
    const payload = {
      business_id: id,
      business_type: businessType,
      company_number: company?.number,
      ...s,
      declaration: fd.get('declaration') === 'on',
      files: files.map(({ field, file }) => ({ field, name: file.name, type: file.type, size: file.size })),
    };
    try {
      await autosave();
      setProgress('Checking your details...');
      const res = await fetch('/api/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? 'Something went wrong');
      const uploads: { index: number; signedUrl: string }[] = json.uploads;
      for (const [n, u] of uploads.entries()) {
        setProgress(`Uploading file ${n + 1} of ${uploads.length}...`);
        await uploadToSignedUrl(u.signedUrl, files[u.index].file);
      }
      setProgress('Sending...');
      const done = await fetch('/api/apply/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: json.id, uploadToken: json.uploadToken }) }).then((r) => r.json());
      if (!done.ok) throw new Error(done.error ?? 'Something went wrong');
      window.location.assign(`/account/${id}?sent=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setProgress(null);
    }
  }

  const pl = str(saved.pl_cover_amount);
  return (
    <form ref={formRef} onSubmit={onSubmit} className="form">
      <p className="save-state small" aria-live="polite">
        {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'All changes saved' : saveState === 'error' ? 'Could not save just now. Keep going, we will try again.' : 'Your answers save as you go, so you can stop and come back any time.'}
      </p>

      <fieldset>
        <legend>1. Your business</legend>
        {company && (
          <div className="ok-box">
            <strong>{company.name}</strong> ({company.number})<br /><span className="muted small">{company.address}</span>
          </div>
        )}
        <label>Trading name (as contractors will see it)<input name="trading_name" defaultValue={str(saved.trading_name)} required minLength={2} /></label>
        {businessType === 'sole_trader' && (
          <>
            <label>Your full name<input name="owner_full_name" defaultValue={str(saved.owner_full_name)} required /></label>
            <label>Business address<textarea name="business_address" rows={2} defaultValue={str(saved.business_address)} required /></label>
            <label>Proof of your business (PDF, JPG or PNG)
              <input type="file" name="letterhead" accept=".pdf,image/jpeg,image/png" required />
              <span className="hint">Any one of: your letterhead, an invoice or quote you have sent a customer, a business bank statement, or a recent utility bill, showing your trading name and address.</span>
            </label>
          </>
        )}
      </fieldset>

      <fieldset>
        <legend>2. Contact details</legend>
        <label>Contact name<input name="contact_name" defaultValue={str(saved.contact_name)} required /></label>
        <label>Phone<input name="phone" type="tel" defaultValue={str(saved.phone)} required /></label>
        <label>Website (optional)<input name="website" type="url" placeholder="https://" defaultValue={str(saved.website)} /></label>
        <p className="muted small">You log in with {email}.</p>
      </fieldset>

      <fieldset>
        <legend>3. What you do and where</legend>
        <p className="hint">Trades</p>
        <div className="checks">
          {TRADES.map((t) => (
            <label key={t.slug} className="check"><input type="checkbox" name="trades" value={t.slug} defaultChecked={arr(saved.trades).includes(t.slug)} /> {t.label}</label>
          ))}
        </div>
        <div className="two">
          <label>Base postcode<input name="base_postcode" required placeholder="e.g. SG1 2AB" defaultValue={str(saved.base_postcode)} /></label>
          <label>Will travel up to
            <select name="radius_miles" defaultValue={str(saved.radius_miles) || '30'}>
              {[10, 20, 30, 50, 75, 100, 150, 300].map((m) => <option key={m} value={m}>{m} miles</option>)}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>4. Insurance and accreditations</legend>
        <div className="two">
          <label>Public liability cover
            <select name="pl_cover_amount" required defaultValue={pl}>
              <option value="" disabled>Choose</option>
              {PL_COVER_OPTIONS.map((n) => <option key={n} value={n}>{gbp(n)}</option>)}
            </select>
          </label>
          <label>Policy expiry<input type="date" name="pl_expiry" required defaultValue={str(saved.pl_expiry)} /></label>
        </div>
        <label>Public liability certificate
          <input type="file" name="pl_certificate" accept=".pdf,image/jpeg,image/png" required />
        </label>
        <details open={!!str(saved.el_cover_amount)}>
          <summary>Employers liability (if you employ staff)</summary>
          <div className="two">
            <label>Cover
              <select name="el_cover_amount" defaultValue={str(saved.el_cover_amount)}>
                <option value="">Not applicable</option>
                {[5_000_000, 10_000_000].map((n) => <option key={n} value={n}>{gbp(n)}</option>)}
              </select>
            </label>
            <label>Expiry<input type="date" name="el_expiry" defaultValue={str(saved.el_expiry)} /></label>
          </div>
          <label>Certificate<input type="file" name="el_certificate" accept=".pdf,image/jpeg,image/png" /></label>
        </details>
        <p className="hint">Accreditations you hold</p>
        <AccreditationPicker defaultSelected={arr(saved.accreditations)} defaultExpiries={(saved.accreditation_expiries as Record<string, string>) ?? {}} />
        <label>Accreditation certificates (optional, select several)
          <input type="file" name="accreditation_docs" multiple accept=".pdf,image/jpeg,image/png" />
        </label>
      </fieldset>

      <fieldset>
        <legend>5. Show your work</legend>
        <label>About your business (optional)
          <textarea name="description" rows={4} maxLength={2000} defaultValue={str(saved.description)} placeholder="Types of jobs, typical contract sizes, who you work for" />
        </label>
        <label>Photos of your work (up to {MAX_PHOTOS})
          <input type="file" name="photos" multiple accept="image/jpeg,image/png,image/webp" />
        </label>
        <p className="muted small">Files (certificates and photos) upload when you press Send for approval, so add them just before you send.</p>
      </fieldset>

      <fieldset>
        <label className="check">
          <input type="checkbox" name="declaration" required /> I confirm the information and documents I have provided are accurate and current, and I will update them if anything changes.
        </label>
      </fieldset>

      {error && <p className="err big">{error}</p>}
      <button type="submit" className="primary" disabled={!!progress}>{progress ?? 'Send for approval'}</button>
      <p className="muted small">We check your details by hand, usually within one working day. Your listing goes live once approved.</p>
    </form>
  );
}
