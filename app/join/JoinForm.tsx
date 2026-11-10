'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadToSignedUrl } from '@/lib/supabaseBrowser';
import AccreditationPicker, { readAccreditationExpiries } from '@/app/AccreditationPicker';
import { TRADES, PL_COVER_OPTIONS, MAX_PHOTOS, gbp } from '@/lib/config';

type CompanyInfo = { name: string; status: string; incorporatedOn: string | null; registeredAddress: string; companyNumber: string };
type FileField = 'letterhead' | 'pl_certificate' | 'el_certificate' | 'accreditation_docs' | 'photos';

type PriceInfo = { mode: 'bands' | 'plans' | 'membership'; bands: { key: string; label: string; price: number }[]; plans: { verified: number; pro: number }; membership: { monthly: number; yearly: number; trial_days: number } };

export default function JoinForm({ prices }: { prices: PriceInfo }) {
  const router = useRouter();
  const [type, setType] = useState<'ltd' | 'sole_trader' | null>(null);
  const [companyNumber, setCompanyNumber] = useState('');
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [chError, setChError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [tradingName, setTradingName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [band, setBand] = useState('');
  const price = prices.mode === 'bands' ? prices.bands.find((b) => b.key === band)?.price : undefined;

  async function lookupCompany() {
    setChecking(true);
    setChError(null);
    setCompany(null);
    try {
      const res = await fetch(`/api/companies-house?number=${encodeURIComponent(companyNumber)}`);
      const json = await res.json();
      if (!json.ok) setChError(json.reason ?? 'Lookup failed');
      else {
        setCompany(json);
        if (!tradingName) setTradingName(json.name);
      }
    } catch {
      setChError('Lookup failed. Check your connection and try again.');
    } finally {
      setChecking(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (type === 'ltd' && !company) {
      setError('Please check your company number with Companies House first.');
      return;
    }

    const fd = new FormData(e.currentTarget);
    const fileFields: FileField[] = ['letterhead', 'pl_certificate', 'el_certificate', 'accreditation_docs', 'photos'];
    const files: { field: FileField; file: File }[] = [];
    for (const field of fileFields) {
      for (const f of fd.getAll(field)) if (f instanceof File && f.size > 0) files.push({ field, file: f });
    }
    if (files.filter((f) => f.field === 'photos').length > MAX_PHOTOS) {
      setError(`Up to ${MAX_PHOTOS} photos please.`);
      return;
    }

    if (String(fd.get('password') ?? '') !== String(fd.get('password_confirm') ?? '')) {
      setError('The two passwords do not match.');
      return;
    }

    const payload: Record<string, unknown> = {
      business_type: type,
      company_number: type === 'ltd' ? company?.companyNumber : undefined,
      owner_full_name: fd.get('owner_full_name') ?? undefined,
      trading_name: tradingName,
      contact_name: fd.get('contact_name'),
      email: fd.get('email'),
      password: fd.get('password'),
      phone: fd.get('phone'),
      website: fd.get('website'),
      business_address: fd.get('business_address'),
      description: fd.get('description'),
      base_postcode: fd.get('base_postcode'),
      radius_miles: fd.get('radius_miles'),
      turnover_band: band,
      trades: fd.getAll('trades'),
      accreditations: fd.getAll('accreditations'),
      accreditation_expiries: readAccreditationExpiries(fd),
      pl_cover_amount: fd.get('pl_cover_amount'),
      pl_expiry: fd.get('pl_expiry'),
      el_cover_amount: fd.get('el_cover_amount'),
      el_expiry: fd.get('el_expiry'),
      declaration: fd.get('declaration') === 'on',
      hp_check: fd.get('tlgb_hp_zq') ? 'yes' : '',
      files: files.map(({ field, file }) => ({ field, name: file.name, type: file.type, size: file.size })),
    };

    try {
      setProgress('Checking your details...');
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? 'Something went wrong');
      if (!json.id) return router.push('/join/thanks');

      const uploads: { index: number; signedUrl: string }[] = json.uploads;
      for (const [n, u] of uploads.entries()) {
        setProgress(`Uploading file ${n + 1} of ${uploads.length}...`);
        await uploadToSignedUrl(u.signedUrl, files[u.index].file);
      }

      setProgress('Submitting...');
      const done = await fetch('/api/apply/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: json.id, uploadToken: json.uploadToken }),
      }).then((r) => r.json());
      if (!done.ok) throw new Error(done.error ?? 'Something went wrong');

      router.push('/join/thanks');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setProgress(null);
    }
  }

  return (
    <form onSubmit={onSubmit} className="form">
      {/* Honeypot */}
      <input type="checkbox" name="tlgb_hp_zq" value="1" tabIndex={-1} autoComplete="off" className="hp" aria-hidden />

      <fieldset>
        <legend>1. Your business</legend>
        <p className="hint">How is your business set up?</p>
        <div className="choice-row">
          <label className={`choice ${type === 'ltd' ? 'on' : ''}`}>
            <input type="radio" name="business_type" value="ltd" required
              onChange={() => setType('ltd')} checked={type === 'ltd'} />
            <strong>Limited company</strong>
            <span>We check you on Companies House</span>
          </label>
          <label className={`choice ${type === 'sole_trader' ? 'on' : ''}`}>
            <input type="radio" name="business_type" value="sole_trader" required
              onChange={() => setType('sole_trader')} checked={type === 'sole_trader'} />
            <strong>Sole trader</strong>
            <span>Upload proof of your business instead</span>
          </label>
        </div>

        {type === 'ltd' && (
          <div className="sub">
            <label>Company number
              <div className="inline">
                <input value={companyNumber} onChange={(e) => { setCompanyNumber(e.target.value); setCompany(null); }}
                  placeholder="e.g. 09876543" required />
                <button type="button" onClick={lookupCompany} disabled={checking || companyNumber.trim().length < 6}>
                  {checking ? 'Checking...' : 'Check'}
                </button>
              </div>
            </label>
            {chError && <p className="err">{chError}</p>}
            {company && (
              <div className="ok-box">
                <strong>{company.name}</strong> ({company.companyNumber})<br />
                Status: active{company.incorporatedOn ? `, incorporated ${new Date(company.incorporatedOn).toLocaleDateString('en-GB')}` : ''}<br />
                <span className="muted">{company.registeredAddress}</span>
              </div>
            )}
          </div>
        )}

        {type === 'sole_trader' && (
          <div className="sub">
            <label>Your full name<input name="owner_full_name" required /></label>
            <label>Business address<textarea name="business_address" rows={2} required /></label>
            <label>Proof of your business (PDF, JPG or PNG)
              <input type="file" name="letterhead" accept=".pdf,image/jpeg,image/png" required />
              <span className="hint">Any one of: your letterhead, an invoice or quote you have sent a customer, a business bank statement, or a recent utility bill. It must show your trading name and address. We check it by hand.</span>
            </label>
          </div>
        )}

        {type && (
          <label>Annual turnover
            <select value={band} onChange={(e) => setBand(e.target.value)} required>
              <option value="" disabled>Choose</option>
              {prices.bands.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
            </select>
            <span className="hint">
              {prices.mode === 'membership'
                ? `Once approved, choose a free listing or verified membership from £${prices.membership.monthly} a month${prices.membership.trial_days ? `, with ${prices.membership.trial_days} days free` : ''}.`
                : prices.mode === 'plans'
                ? `Membership is Verified (£${prices.plans.verified} a year) or Pro (£${prices.plans.pro} a year). You choose once your listing is approved.`
                : price ? `Your listing: £${price} a year.` : 'Listing prices are banded by turnover, so smaller firms pay less.'}
            </span>
          </label>
        )}

        {type && (
          <label>Trading name
            <input value={tradingName} onChange={(e) => setTradingName(e.target.value)} required />
          </label>
        )}
      </fieldset>

      {type && (
        <>
          <fieldset>
            <legend>2. Contact details</legend>
            <label>Contact name<input name="contact_name" required /></label>
            <label>Email<input name="email" type="email" required autoComplete="email" /></label>
            <label>Choose a password<input name="password" type="password" required minLength={8} autoComplete="new-password" />
              <span className="hint">At least 8 characters. You will use this with your email to log in.</span></label>
            <label>Type the password again<input name="password_confirm" type="password" required minLength={8} autoComplete="new-password" /></label>
            <label>Phone<input name="phone" type="tel" required /></label>
            <label>Website (optional)<input name="website" type="url" placeholder="https://" /></label>
          </fieldset>

          <fieldset>
            <legend>3. What you do and where</legend>
            <p className="hint">Trades</p>
            <div className="checks">
              {TRADES.map((t) => (
                <label key={t.slug} className="check"><input type="checkbox" name="trades" value={t.slug} /> {t.label}</label>
              ))}
            </div>
            <div className="two">
              <label>Base postcode<input name="base_postcode" required placeholder="e.g. SG1 2AB" /></label>
              <label>Will travel up to
                <select name="radius_miles" defaultValue="30">
                  {[10, 20, 30, 50, 75, 100, 150, 300].map((m) => <option key={m} value={m}>{m} miles</option>)}
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>4. Insurance and accreditations</legend>
            <div className="two">
              <label>Public liability cover
                <select name="pl_cover_amount" required defaultValue="">
                  <option value="" disabled>Choose</option>
                  {PL_COVER_OPTIONS.map((n) => <option key={n} value={n}>{gbp(n)}</option>)}
                </select>
              </label>
              <label>Policy expiry<input type="date" name="pl_expiry" required /></label>
            </div>
            <label>Public liability certificate
              <input type="file" name="pl_certificate" accept=".pdf,image/jpeg,image/png" required />
            </label>

            <details>
              <summary>Employers liability (if you employ staff)</summary>
              <div className="two">
                <label>Cover
                  <select name="el_cover_amount" defaultValue="">
                    <option value="">Not applicable</option>
                    {[5_000_000, 10_000_000].map((n) => <option key={n} value={n}>{gbp(n)}</option>)}
                  </select>
                </label>
                <label>Expiry<input type="date" name="el_expiry" /></label>
              </div>
              <label>Certificate<input type="file" name="el_certificate" accept=".pdf,image/jpeg,image/png" /></label>
            </details>

            <p className="hint">Accreditations you hold</p>
            <AccreditationPicker />
            <label>Accreditation certificates (optional, select several)
              <input type="file" name="accreditation_docs" multiple accept=".pdf,image/jpeg,image/png" />
            </label>
          </fieldset>

          <fieldset>
            <legend>5. Show your work</legend>
            <label>About your business (optional)
              <textarea name="description" rows={4} maxLength={2000}
                placeholder="Types of jobs, typical contract sizes, who you work for" />
            </label>
            <label>Photos of your work (up to {MAX_PHOTOS})
              <input type="file" name="photos" multiple accept="image/jpeg,image/png,image/webp" />
            </label>
          </fieldset>

          <fieldset>
            <label className="check">
              <input type="checkbox" name="declaration" required /> I confirm the information and documents I have
              provided are accurate and current, and I will update them if anything changes. I agree to the{' '}
              <a href="/legal/terms" target="_blank">website terms</a> and <a href="/legal/member-terms" target="_blank">member terms</a>,
              and I have read the <a href="/legal/privacy" target="_blank">privacy notice</a>.
            </label>
          </fieldset>

          {error && <p className="err big">{error}</p>}
          <button type="submit" className="primary" disabled={!!progress}>
            {progress ?? 'Submit application'}
          </button>
        </>
      )}
    </form>
  );
}
