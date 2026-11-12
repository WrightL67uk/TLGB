'use client';

import { useEffect, useRef, useState } from 'react';

type Hit = { companyNumber: string; name: string; status: string; address: string };

/** The account step for suppliers: set-up, Companies House, VAT, name, email and password. Payment and the rest come after. */
export default function SupplierSignup({ tier }: { tier: 'appear' | 'match' }) {
  const [type, setType] = useState<'ltd' | 'sole_trader' | null>(null);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const [company, setCompany] = useState<Hit | null>(null);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [vat, setVat] = useState<'yes' | 'no' | null>(null);
  const [domestic, setDomestic] = useState<'yes' | 'no' | null>(null);
  const [vatNo, setVatNo] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (type !== 'ltd' || company || q.trim().length < 2) { setHits([]); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`/api/companies-house?q=${encodeURIComponent(q.trim())}`).then((x) => x.json());
        setHits(r.results ?? []);
      } catch { setHits([]); } finally { setSearching(false); }
    }, 350);
  }, [q, type, company]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (type === 'ltd' && !company) return setError('Search for your company and pick it from the list.');
    if (!vat) return setError('Tell us whether you are VAT registered.');
    if (!domestic) return setError('Tell us whether you supply homeowners.');
    if (pw !== pw2) return setError('The two passwords do not match.');
    setBusy(true);
    try {
      const hp = new FormData(e.currentTarget).get('tlgb_hp_zq') ? 'yes' : '';
      const res = await fetch('/api/suppliers/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier, business_type: type, company_number: company?.companyNumber, trading_name: type === 'ltd' ? company?.name : name,
          contact_name: contact, phone, does_domestic: domestic, vat_registered: vat, vat_number: vat === 'yes' ? vatNo : undefined,
          email, password: pw, terms, hp,
        }),
      });
      const json = await res.json();
      if (!json.ok) { setError(json.error ?? 'Something went wrong. Try again.'); setBusy(false); return; }
      window.location.assign(json.next);
    } catch {
      setError('Could not connect. Check your internet and try again.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="form quick-start">
      <input type="checkbox" name="tlgb_hp_zq" value="1" tabIndex={-1} autoComplete="off" className="hp" aria-hidden />

      <p className="hint" style={{ marginBottom: 6 }}>How is your business set up?</p>
      <div className="choice-row">
        <label className={`choice ${type === 'ltd' ? 'on' : ''}`}>
          <input type="radio" name="business_type" required checked={type === 'ltd'} onChange={() => setType('ltd')} />
          <strong>Limited company</strong>
          <span>We check you on Companies House</span>
        </label>
        <label className={`choice ${type === 'sole_trader' ? 'on' : ''}`}>
          <input type="radio" name="business_type" required checked={type === 'sole_trader'} onChange={() => setType('sole_trader')} />
          <strong>Sole trader</strong>
          <span>Or partnership</span>
        </label>
      </div>

      {type === 'ltd' && (
        company ? (
          <div className="ok-box">
            <strong>{company.name}</strong> ({company.companyNumber})<br />
            <span className="muted small">{company.address}</span><br />
            <button type="button" className="linkish small" onClick={() => { setCompany(null); setQ(''); }}>Not you? Search again</button>
          </div>
        ) : (
          <label>Company name or number
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Start typing your company name" autoComplete="organization" />
            {searching && <span className="hint">Searching Companies House...</span>}
            {hits.length > 0 && (
              <ul className="ch-hits">
                {hits.map((h) => (
                  <li key={h.companyNumber}>
                    <button type="button" disabled={h.status !== 'active'} onClick={() => { setCompany(h); setHits([]); }}>
                      <strong>{h.name}</strong> <span className="muted small">{h.companyNumber}{h.status !== 'active' ? ` (${h.status})` : ''}</span><br />
                      <span className="muted small">{h.address}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </label>
        )
      )}

      {type === 'sole_trader' && (
        <label>Business name
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} autoComplete="organization" placeholder="The name you trade as" />
        </label>
      )}

      {type && (
        <>
          <div className="two">
            <label>Your name
              <input value={contact} onChange={(e) => setContact(e.target.value)} required minLength={2} autoComplete="name" />
            </label>
            <label>Phone
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required autoComplete="tel" />
            </label>
          </div>

          <p className="hint" style={{ marginBottom: 6 }}>Do you sell to homeowners (the general public)?</p>
          <div className="choice-row">
            <label className={`choice ${domestic === 'yes' ? 'on' : ''}`}>
              <input type="radio" name="domestic" required checked={domestic === 'yes'} onChange={() => setDomestic('yes')} />
              <strong>Yes</strong>
            </label>
            <label className={`choice ${domestic === 'no' ? 'on' : ''}`}>
              <input type="radio" name="domestic" required checked={domestic === 'no'} onChange={() => setDomestic('no')} />
              <strong>No</strong>
            </label>
          </div>
          <p className="hint" style={{ marginTop: -2 }}>Homeowners can search TLGB for free. They only see businesses that say yes. You can change this any time.</p>

          <p className="hint" style={{ marginBottom: 6 }}>Is your business VAT registered?</p>
          <div className="choice-row">
            <label className={`choice ${vat === 'yes' ? 'on' : ''}`}>
              <input type="radio" name="vat" required checked={vat === 'yes'} onChange={() => setVat('yes')} />
              <strong>Yes</strong>
            </label>
            <label className={`choice ${vat === 'no' ? 'on' : ''}`}>
              <input type="radio" name="vat" required checked={vat === 'no'} onChange={() => setVat('no')} />
              <strong>No</strong>
            </label>
          </div>
          {vat === 'yes' && (
            <label>VAT number
              <input value={vatNo} onChange={(e) => setVatNo(e.target.value)} required placeholder="GB 123 4567 89" />
              <span className="hint">We check this against HMRC&rsquo;s register when we approve your profile.</span>
            </label>
          )}

          <label>Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="name@company.co.uk" />
            <span className="hint">This is your login, and where price requests are sent on the Match plan.</span>
          </label>
          <div className="two">
            <label>Choose a password
              <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={8} autoComplete="new-password" />
            </label>
            <label>Type it again
              <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required minLength={8} autoComplete="new-password" />
            </label>
          </div>
          <p className="hint" style={{ marginTop: -6 }}>At least 8 characters.</p>
          <label className="check">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} required />
            <span>I agree to the <a href="/legal/terms" target="_blank">website terms</a> and <a href="/legal/member-terms" target="_blank">member terms</a> (including the supplier plan terms), and I have read the <a href="/legal/privacy" target="_blank">privacy notice</a>.</span>
          </label>
          {error && <p className="err big">{error}</p>}
          <button type="submit" className="primary" disabled={busy}>{busy ? 'Opening secure payment...' : 'Continue to payment'}</button>
          <p className="muted small">Next you go to Stripe to pay for the year. Then you add your products, pictures and company details, and send them to us to check. If we cannot approve your listing, you get your money back.</p>
        </>
      )}
    </form>
  );
}
