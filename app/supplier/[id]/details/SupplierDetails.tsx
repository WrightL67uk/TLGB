'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadToSignedUrl } from '@/lib/supabaseBrowser';
import { SUPPLIER_CATEGORIES } from '@/lib/resources';
import { DELIVERY_OPTIONS, STANDARDS } from '@/lib/supplierOptions';

type S = {
  id: string; status: string; name: string; contact_name: string; phone: string; public_email: string; email: string; website: string;
  address: string; town: string; postcode: string; delivers_nationally: boolean; categories: string[]; description: string; about: string;
  year_established: string; delivery_options: string[]; min_order: string; trade_accounts: boolean; trade_only: boolean; standards: string[];
  standards_other: string; product_liability: boolean | null; tier: string | null;
};
type Photo = { id: string; url: string; caption: string };

async function post(url: string, body: unknown) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
}

export default function SupplierDetails({ supplier, logoUrl, photos }: { supplier: S; logoUrl: string | null; photos: Photo[] }) {
  const router = useRouter();
  const [f, setF] = useState(supplier);
  const [caps, setCaps] = useState<Record<string, string>>(Object.fromEntries(photos.map((p) => [p.id, p.caption])));
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const started = f.status === 'started';
  const set = <K extends keyof S>(k: K, v: S[K]) => setF((x) => ({ ...x, [k]: v }));
  const toggle = (k: 'categories' | 'delivery_options' | 'standards', v: string) =>
    setF((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((i) => i !== v) : [...x[k], v] }));

  async function upload(kind: 'photo' | 'logo', files: File[], input: HTMLInputElement) {
    if (!files.length) return;
    setBusy(kind); setMsg(null);
    try {
      const meta = files.map((x) => ({ name: x.name, type: x.type, size: x.size }));
      const prep = await post('/api/supplier/uploads', { supplierId: f.id, kind, files: meta });
      if (!prep.ok) throw new Error(prep.error);
      for (const u of prep.uploads as { index: number; path: string; signedUrl: string }[]) await uploadToSignedUrl(u.signedUrl, files[u.index]);
      const done = await post('/api/supplier/uploads/complete', { supplierId: f.id, kind, files: prep.uploads.map((u: { index: number; path: string }) => ({ ...meta[u.index], path: u.path })) });
      if (!done.ok) throw new Error(done.error);
      input.value = '';
      setMsg({ kind: 'ok', text: kind === 'logo' ? 'Logo added.' : 'Pictures added. Add a caption to each below, then save.' });
      router.refresh();
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Upload failed. Try again.' });
    } finally { setBusy(null); }
  }

  async function remove(body: { photoId?: string; logo?: boolean }) {
    setBusy('del'); setMsg(null);
    const r = await post('/api/supplier/photos/delete', { supplierId: f.id, ...body });
    setBusy(null);
    if (!r.ok) return setMsg({ kind: 'err', text: r.error ?? 'Could not delete.' });
    router.refresh();
  }

  async function save(submit: boolean) {
    setBusy(submit ? 'submit' : 'save'); setMsg(null);
    const r = await post('/api/supplier/details', {
      supplierId: f.id, submit, contact_name: f.contact_name, phone: f.phone, public_email: f.public_email, website: f.website, address: f.address,
      town: f.town, postcode: f.postcode, delivers_nationally: f.delivers_nationally, categories: f.categories, description: f.description,
      about: f.about, year_established: f.year_established, delivery_options: f.delivery_options, min_order: f.min_order,
      trade_accounts: f.trade_accounts, trade_only: f.trade_only, standards: f.standards, standards_other: f.standards_other,
      product_liability: f.product_liability, captions: caps,
    });
    setBusy(null);
    if (!r.ok) { setMsg({ kind: 'err', text: r.error ?? 'Something went wrong.' }); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (r.submitted) { window.location.assign(`/supplier/${f.id}?sent=1`); return; }
    setMsg({ kind: 'ok', text: 'Saved.' });
    router.refresh();
  }

  const yn = (v: boolean | null, set1: (b: boolean) => void, name: string) => (
    <div className="choice-row">
      <label className={`choice ${v === true ? 'on' : ''}`}><input type="radio" name={name} checked={v === true} onChange={() => set1(true)} /><strong>Yes</strong></label>
      <label className={`choice ${v === false ? 'on' : ''}`}><input type="radio" name={name} checked={v === false} onChange={() => set1(false)} /><strong>No</strong></label>
    </div>
  );

  return (
    <form className="res-form" onSubmit={(e) => { e.preventDefault(); void save(started); }}>
      {msg && <p className={msg.kind === 'ok' ? 'ok-box' : 'err big'}>{msg.text}</p>}

      <h2 style={{ margin: 0 }}>What you supply</h2>
      <div className="checks">
        {SUPPLIER_CATEGORIES.map((c) => (
          <label key={c.key}><input type="checkbox" checked={f.categories.includes(c.key)} onChange={() => toggle('categories', c.key)} /> {c.label}</label>
        ))}
      </div>
      {f.tier === 'match' && <p className="hint" style={{ margin: 0 }}>On the Match plan, these decide which estimate requests you receive.</p>}
      <label>Summary for the supplier list (one or two sentences)
        <textarea value={f.description} onChange={(e) => set('description', e.target.value)} maxLength={400} rows={3} placeholder="What you supply and who to" />
      </label>
      <label>About us (shown on your company profile)
        <textarea value={f.about} onChange={(e) => set('about', e.target.value)} maxLength={2000} rows={6} placeholder="Who you are, what you are known for, your ranges, how you look after trade customers" />
        <span className="hint">{f.about.length} of 2,000 characters</span>
      </label>

      <h2 style={{ margin: '12px 0 0' }}>Logo and pictures</h2>
      <p className="hint" style={{ margin: 0 }}>Show your products, your yard and your stock. At least one picture is needed to send your profile for checking.</p>
      <div className="panel" style={{ margin: 0 }}>
        <strong>Logo (optional)</strong>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
          {logoUrl && <img src={logoUrl} alt="Your logo" style={{ height: 56, maxWidth: 160, objectFit: 'contain', background: '#fff', border: '1px solid #ddd8cc', borderRadius: 6, padding: 4 }} />}
          <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy === 'logo'} onChange={(e) => void upload('logo', Array.from(e.target.files ?? []), e.target)} />
          {logoUrl && <button type="button" className="linkish small" onClick={() => void remove({ logo: true })}>Remove</button>}
        </div>
      </div>
      <div className="panel" style={{ margin: 0 }}>
        <strong>Product and premises pictures ({photos.length} of 12)</strong>
        <div className="sup-gallery">
          {photos.map((p) => (
            <div key={p.id} className="sup-pic">
              <img src={p.url} alt="" />
              <input value={caps[p.id] ?? ''} onChange={(e) => setCaps((c) => ({ ...c, [p.id]: e.target.value }))} maxLength={120} placeholder="Caption, e.g. 40-60cm Carpinus hedging" />
              <button type="button" className="linkish small" onClick={() => void remove({ photoId: p.id })}>Delete</button>
            </div>
          ))}
        </div>
        <input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={busy === 'photo' || photos.length >= 12} onChange={(e) => void upload('photo', Array.from(e.target.files ?? []), e.target)} />
        {busy === 'photo' && <span className="hint"> Uploading...</span>}
      </div>

      <h2 style={{ margin: '12px 0 0' }}>Contact details shown on your listing</h2>
      <div className="row">
        <label>Contact name<input value={f.contact_name} onChange={(e) => set('contact_name', e.target.value)} required /></label>
        <label>Phone<input value={f.phone} onChange={(e) => set('phone', e.target.value)} required /></label>
      </div>
      <div className="row">
        <label>Email shown to buyers<input type="email" value={f.public_email} onChange={(e) => set('public_email', e.target.value)} placeholder={f.email} /><span className="hint">Leave blank to show {f.email}.</span></label>
        <label>Website<input value={f.website} onChange={(e) => set('website', e.target.value)} placeholder="www.example.co.uk" /></label>
      </div>
      <label>Address (optional)<input value={f.address} onChange={(e) => set('address', e.target.value)} maxLength={200} /></label>
      <div className="row">
        <label>Town<input value={f.town} onChange={(e) => set('town', e.target.value)} required /></label>
        <label>Postcode of your yard or depot<input value={f.postcode} onChange={(e) => set('postcode', e.target.value)} required /></label>
      </div>

      <h2 style={{ margin: '12px 0 0' }}>How you work with trade buyers</h2>
      <label className="checks" style={{ fontWeight: 400 }}><input type="checkbox" checked={f.delivers_nationally} onChange={(e) => set('delivers_nationally', e.target.checked)} /> We deliver nationally</label>
      <div className="checks">
        {DELIVERY_OPTIONS.map((d) => <label key={d.key}><input type="checkbox" checked={f.delivery_options.includes(d.key)} onChange={() => toggle('delivery_options', d.key)} /> {d.label}</label>)}
      </div>
      <div className="row">
        <label>Minimum order (optional)<input value={f.min_order} onChange={(e) => set('min_order', e.target.value)} maxLength={120} placeholder="e.g. £250, or one pallet" /></label>
        <label>Year established (optional)<input type="number" value={f.year_established} onChange={(e) => set('year_established', e.target.value)} min={1800} max={new Date().getFullYear()} /></label>
      </div>
      <label className="checks" style={{ fontWeight: 400 }}><input type="checkbox" checked={f.trade_accounts} onChange={(e) => set('trade_accounts', e.target.checked)} /> We offer trade accounts and credit terms</label>
      <label className="checks" style={{ fontWeight: 400 }}><input type="checkbox" checked={f.trade_only} onChange={(e) => set('trade_only', e.target.checked)} /> We supply trade customers only</label>

      <h2 style={{ margin: '12px 0 0' }}>Standards and insurance (optional)</h2>
      <p className="hint" style={{ margin: 0 }}>You do not need any accreditation to join. Tick anything that applies and buyers will see it as something you have told us. We may ask to see evidence.</p>
      <div className="checks">
        {STANDARDS.map((d) => <label key={d.key}><input type="checkbox" checked={f.standards.includes(d.key)} onChange={() => toggle('standards', d.key)} /> {d.label}</label>)}
      </div>
      <label>Anything else (optional)<input value={f.standards_other} onChange={(e) => set('standards_other', e.target.value)} maxLength={200} placeholder="Other schemes, awards or memberships" /></label>
      <div>
        <strong>Do you hold product liability insurance?</strong>
        {yn(f.product_liability, (b) => set('product_liability', b), 'pli')}
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {started ? (
          <>
            <button type="button" disabled={!!busy} onClick={() => void save(false)}>{busy === 'save' ? 'Saving...' : 'Save and finish later'}</button>
            <button type="submit" className="primary" disabled={!!busy}>{busy === 'submit' ? 'Sending...' : 'Send for approval'}</button>
          </>
        ) : (
          <button type="submit" className="primary" disabled={!!busy}>{busy === 'save' ? 'Saving...' : 'Save changes'}</button>
        )}
      </div>
      {started && <p className="muted small">We check every supplier by hand before it goes live, usually within a working day. If we cannot approve your listing, you get your money back.</p>}
    </form>
  );
}
