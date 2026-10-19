'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadToSignedUrl } from '@/lib/supabaseBrowser';
import AccreditationPicker, { readAccreditationExpiries } from '@/app/AccreditationPicker';
import { TRADES, TURNOVER_BANDS, PL_COVER_OPTIONS, MAX_PHOTOS, gbp } from '@/lib/config';

type FileField = 'letterhead' | 'pl_certificate' | 'el_certificate' | 'accreditation_docs' | 'photos';
type Msg = { kind: 'ok' | 'err'; text: string } | null;

type Props = {
  b: {
    id: string; status: string; business_type: 'ltd' | 'sole_trader'; company_number: string | null; email: string;
    trading_name: string; contact_name: string; phone: string; website: string; business_address: string; description: string;
    base_postcode: string; radius_miles: number; trades: string[]; accreditations: string[]; accreditation_expiries: Record<string, string>; turnover_band: string;
    pl_cover_amount: number | ''; pl_expiry: string; el_cover_amount: number | ''; el_expiry: string;
  };
  docs: { id: string; label: string; fileName: string; date: string }[];
  photos: { id: string; url: string }[];
};

const DOC_ACCEPT = '.pdf,image/jpeg,image/png';
const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';

export default function AccountEditor({ b, docs, photos }: Props) {
  const router = useRouter();
  const [msg, setMsg] = useState<Msg>(null);
  const [saving, setSaving] = useState(false);
  const [busyField, setBusyField] = useState<string | null>(null);
  const locked = b.status === 'suspended';

  async function post(url: string, body: unknown) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({ ok: false, error: 'Something went wrong. Try again.' }));
    if (res.status === 401) router.push('/login');
    return json;
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const json = await post(`/api/account/listing/${b.id}`, {
      trading_name: fd.get('trading_name'),
      contact_name: fd.get('contact_name'),
      phone: fd.get('phone'),
      website: fd.get('website'),
      business_address: fd.get('business_address'),
      description: fd.get('description'),
      base_postcode: fd.get('base_postcode'),
      radius_miles: fd.get('radius_miles'),
      trades: fd.getAll('trades'),
      accreditations: fd.getAll('accreditations'),
      accreditation_expiries: readAccreditationExpiries(fd),
      turnover_band: fd.get('turnover_band'),
      pl_cover_amount: fd.get('pl_cover_amount'),
      pl_expiry: fd.get('pl_expiry'),
      el_cover_amount: fd.get('el_cover_amount'),
      el_expiry: fd.get('el_expiry'),
    });
    setSaving(false);
    if (!json.ok) return setMsg({ kind: 'err', text: json.error });
    setMsg({
      kind: 'ok',
      text:
        json.outcome === 'resubmitted' ? 'Saved and sent back to us for review. We will email you once we have looked at it.'
        : json.outcome === 'recheck' ? 'Saved. Some of these changes will be checked by our team. Your listing stays live meanwhile.'
        : 'Changes saved.',
    });
    router.refresh();
  }

  async function upload(field: FileField, input: HTMLInputElement | null) {
    const files = input?.files ? Array.from(input.files) : [];
    if (!files.length) return setMsg({ kind: 'err', text: 'Choose a file first.' });
    setBusyField(field);
    setMsg(null);
    try {
      const meta = files.map((f) => ({ field, name: f.name, type: f.type, size: f.size }));
      const prep = await post('/api/account/uploads', { businessId: b.id, files: meta });
      if (!prep.ok) throw new Error(prep.error);
      const uploads: { index: number; path: string; signedUrl: string }[] = prep.uploads;
      for (const u of uploads) {
        await uploadToSignedUrl(u.signedUrl, files[u.index]);
      }
      const done = await post('/api/account/uploads/complete', {
        businessId: b.id,
        files: uploads.map((u) => ({ ...meta[u.index], path: u.path })),
      });
      if (!done.ok) throw new Error(done.error);
      if (input) input.value = '';
      setMsg({
        kind: 'ok',
        text: field === 'photos' ? 'Photos added.'
          : field === 'pl_certificate' ? 'Certificate uploaded. If the cover or expiry date has changed, update them under Insurance and save.'
          : 'Document uploaded.' + (done.recheck ? ' We will check it shortly.' : ''),
      });
      router.refresh();
    } catch (err) {
      setMsg({ kind: 'err', text: err instanceof Error ? err.message : 'Upload failed. Try again.' });
    } finally {
      setBusyField(null);
    }
  }

  async function deletePhoto(photoId: string) {
    setBusyField(`photo-${photoId}`);
    const json = await post('/api/account/photos/delete', { businessId: b.id, photoId });
    setBusyField(null);
    if (!json.ok) return setMsg({ kind: 'err', text: json.error });
    setMsg({ kind: 'ok', text: 'Photo removed.' });
    router.refresh();
  }

  const messageBox = msg && (
    <p className={msg.kind === 'ok' ? 'ok-box' : 'err big'} role="status">{msg.text}</p>
  );

  return (
    <div className="editor">
      {messageBox}

      <form onSubmit={save} className="form">
        <fieldset disabled={locked}>
          <legend>Business details</legend>
          <p className="hint">
            {b.business_type === 'ltd' ? `Limited company ${b.company_number}` : 'Sole trader'}. Login email: {b.email}.
            To change either of these, reply to any of our emails.
          </p>
          <label htmlFor="trading_name">Trading name<input id="trading_name" name="trading_name" defaultValue={b.trading_name} required /></label>
          {b.business_type === 'sole_trader' && (
            <label htmlFor="business_address">Business address<textarea id="business_address" name="business_address" rows={2} defaultValue={b.business_address} required /></label>
          )}
          <label htmlFor="turnover_band">Annual turnover
            <select id="turnover_band" name="turnover_band" defaultValue={b.turnover_band} required>
              <option value="" disabled>Choose</option>
              {TURNOVER_BANDS.map((t) => <option key={t.key} value={t.key}>{t.label} (£{t.price} a year)</option>)}
            </select>
          </label>
          <label htmlFor="description">About your business
            <textarea id="description" name="description" rows={5} maxLength={2000} defaultValue={b.description}
              placeholder="Types of jobs, typical contract sizes, who you work for" />
          </label>
        </fieldset>

        <fieldset disabled={locked}>
          <legend>Contact details</legend>
          <label htmlFor="contact_name">Contact name<input id="contact_name" name="contact_name" defaultValue={b.contact_name} required /></label>
          <div className="two">
            <label htmlFor="phone">Phone<input id="phone" name="phone" type="tel" defaultValue={b.phone} required /></label>
            <label htmlFor="website">Website<input id="website" name="website" type="url" defaultValue={b.website} placeholder="https://" /></label>
          </div>
        </fieldset>

        <fieldset disabled={locked}>
          <legend>What you do and where</legend>
          <p className="hint">Trades</p>
          <div className="checks">
            {TRADES.map((t) => (
              <label key={t.slug} className="check" htmlFor={`trade-${t.slug}`}>
                <input id={`trade-${t.slug}`} type="checkbox" name="trades" value={t.slug} defaultChecked={b.trades.includes(t.slug)} /> {t.label}
              </label>
            ))}
          </div>
          <div className="two">
            <label htmlFor="base_postcode">Base postcode<input id="base_postcode" name="base_postcode" defaultValue={b.base_postcode} required /></label>
            <label htmlFor="radius_miles">Will travel up to
              <select id="radius_miles" name="radius_miles" defaultValue={String(b.radius_miles)}>
                {[10, 20, 30, 50, 75, 100, 150, 300].map((m) => <option key={m} value={m}>{m} miles</option>)}
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset disabled={locked}>
          <legend>Insurance and accreditations</legend>
          <p className="hint">Renewed your insurance? Upload the new certificate in Documents first, then change the figures here.</p>
          <div className="two">
            <label htmlFor="pl_cover_amount">Public liability cover
              <select id="pl_cover_amount" name="pl_cover_amount" defaultValue={String(b.pl_cover_amount)} required>
                {PL_COVER_OPTIONS.map((n) => <option key={n} value={n}>{gbp(n)}</option>)}
              </select>
            </label>
            <label htmlFor="pl_expiry">Policy expiry<input id="pl_expiry" type="date" name="pl_expiry" defaultValue={b.pl_expiry} required /></label>
          </div>
          <div className="two">
            <label htmlFor="el_cover_amount">Employers liability
              <select id="el_cover_amount" name="el_cover_amount" defaultValue={String(b.el_cover_amount)}>
                <option value="">Not applicable</option>
                {[5_000_000, 10_000_000].map((n) => <option key={n} value={n}>{gbp(n)}</option>)}
              </select>
            </label>
            <label htmlFor="el_expiry">Expiry<input id="el_expiry" type="date" name="el_expiry" defaultValue={b.el_expiry} /></label>
          </div>
          <p className="hint">Accreditations you hold</p>
          <AccreditationPicker defaultSelected={b.accreditations} defaultExpiries={b.accreditation_expiries} />
        </fieldset>

        {!locked && (
          <button type="submit" className="primary" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
        )}
      </form>

      <section className="panel">
        <h2>Documents</h2>
        {docs.length === 0 ? <p className="muted">No documents yet.</p> : (
          <ul className="docs">
            {docs.map((d) => <li key={d.id}>{d.label} <span className="muted small">{d.fileName}, {d.date}</span></li>)}
          </ul>
        )}
        {!locked && (
          <div className="uploads">
            <UploadRow label="New public liability certificate" field="pl_certificate" accept={DOC_ACCEPT} busy={busyField} onUpload={upload} />
            <UploadRow label="New employers liability certificate" field="el_certificate" accept={DOC_ACCEPT} busy={busyField} onUpload={upload} />
            <UploadRow label="Accreditation certificates" field="accreditation_docs" accept={DOC_ACCEPT} multiple busy={busyField} onUpload={upload} />
            {b.business_type === 'sole_trader' && (
              <UploadRow label="New letterhead" field="letterhead" accept={DOC_ACCEPT} busy={busyField} onUpload={upload} />
            )}
          </div>
        )}
        <p className="muted small">PDF, JPG or PNG, up to 10MB each. Old documents are kept on file.</p>
      </section>

      <section className="panel">
        <h2>Photos of your work</h2>
        {photos.length === 0 ? <p className="muted">No photos yet. Listings with photos get more enquiries.</p> : (
          <div className="gallery">
            {photos.map((p) => (
              <figure key={p.id} className="photo">
                <img src={p.url} alt="" />
                {!locked && (
                  <button type="button" onClick={() => deletePhoto(p.id)} disabled={busyField === `photo-${p.id}`}>
                    {busyField === `photo-${p.id}` ? 'Removing...' : 'Remove'}
                  </button>
                )}
              </figure>
            ))}
          </div>
        )}
        {!locked && photos.length < MAX_PHOTOS && (
          <div className="uploads">
            <UploadRow label={`Add photos (${MAX_PHOTOS - photos.length} more allowed)`} field="photos" accept={PHOTO_ACCEPT} multiple busy={busyField} onUpload={upload} />
          </div>
        )}
      </section>

      {messageBox}
    </div>
  );
}

function UploadRow({ label, field, accept, multiple, busy, onUpload }: {
  label: string; field: FileField; accept: string; multiple?: boolean;
  busy: string | null; onUpload: (field: FileField, input: HTMLInputElement | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="upload-row">
      <label htmlFor={`up-${field}`}>{label}
        <input id={`up-${field}`} ref={ref} type="file" accept={accept} multiple={multiple} />
      </label>
      <button type="button" onClick={() => onUpload(field, ref.current)} disabled={busy !== null}>
        {busy === field ? 'Uploading...' : 'Upload'}
      </button>
    </div>
  );
}
