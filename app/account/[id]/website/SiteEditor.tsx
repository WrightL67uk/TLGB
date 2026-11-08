'use client';
import { useState } from 'react';

type Service = { title: string; text: string };
type Site = {
  slug: string; theme: string; headline: string; intro: string; about: string; services: Service[]; reasons: string[];
  areas: string; hero_photo: string | null; show_phone: boolean; show_email: boolean;
};
type Props = { businessId: string; site: Site; themes: { key: string; label: string; dark: string; accent: string }[]; photos: { path: string; url: string }[] };

async function call(body: object) {
  const res = await fetch('/api/website', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return res.json().catch(() => ({ ok: false, error: 'Something went wrong. Please try again.' }));
}

export function CreateSite({ businessId, suggestion, themes }: { businessId: string; suggestion: string; themes: Props['themes'] }) {
  const [slug, setSlug] = useState(suggestion);
  const [theme, setTheme] = useState('forest');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    const j = await call({ businessId, action: 'create', slug, theme });
    if (j.ok) { window.location.reload(); return; }
    setError(j.error); setBusy(false);
  }
  return (
    <form onSubmit={go} className="panel" style={{ display: 'grid', gap: 14 }}>
      <h2 style={{ margin: 0 }}>Make your website</h2>
      <p style={{ margin: 0 }}>We write a three-page website from your listing, with your photos, checked insurance and accreditations, and an enquiry form. You can change every word before it goes live.</p>
      <label style={{ display: 'grid', gap: 4, fontWeight: 600 }}>Your address
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} maxLength={40} style={{ padding: '8px 10px', border: '1px solid #bbb', font: 'inherit', minWidth: 220 }} />
          <span>.tlgb.co.uk</span>
        </span>
      </label>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 600, marginBottom: 6 }}>Colours</legend>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {themes.map((t) => (
            <label key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 8, border: `2px solid ${theme === t.key ? t.dark : '#ddd'}`, padding: '8px 12px', cursor: 'pointer', borderRadius: 6 }}>
              <input type="radio" name="theme" checked={theme === t.key} onChange={() => setTheme(t.key)} style={{ width: 'auto' }} />
              <span style={{ width: 18, height: 18, background: t.dark, borderRadius: 4 }} /><span style={{ width: 18, height: 18, background: t.accent, borderRadius: 4 }} />{t.label}
            </label>
          ))}
        </div>
      </fieldset>
      {error && <p className="err big">{error}</p>}
      <div><button type="submit" className="sq sq-rust" disabled={busy}>{busy ? 'Writing your website...' : 'Make my website'}</button></div>
    </form>
  );
}

export default function SiteEditor({ businessId, site: start, themes, photos }: Props) {
  const [s, setS] = useState<Site>({ ...start, services: [...start.services, ...Array(Math.max(0, 6 - start.services.length)).fill({ title: '', text: '' })], reasons: [...start.reasons, ...Array(Math.max(0, 5 - start.reasons.length)).fill('')] });
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const set = (patch: Partial<Site>) => setS((x) => ({ ...x, ...patch }));

  async function save(e?: React.FormEvent) {
    e?.preventDefault(); setBusy('save'); setError(''); setMsg('');
    const j = await call({ businessId, action: 'save', site: s });
    setBusy('');
    if (j.ok) { setMsg('Saved.'); if (j.slug !== start.slug) window.location.reload(); } else setError(j.error);
  }
  async function rewrite() {
    if (!confirm('Rewrite the headline, introduction, about, services, reasons and area from your listing? Your current wording will be replaced.')) return;
    setBusy('rewrite'); setError('');
    const j = await call({ businessId, action: 'rewrite' });
    if (j.ok) { window.location.reload(); return; }
    setBusy(''); setError(j.error);
  }
  const input = { padding: '8px 10px', border: '1px solid #bbb', font: 'inherit', width: '100%' } as React.CSSProperties;
  const lab = { display: 'grid', gap: 4, fontWeight: 600 } as React.CSSProperties;

  return (
    <form onSubmit={save} className="panel" style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Edit your website</h2>
        <button type="button" className="sq" style={{ background: 'var(--forest)' }} onClick={rewrite} disabled={!!busy}>{busy === 'rewrite' ? 'Rewriting...' : 'Rewrite the wording for me'}</button>
      </div>

      <label style={lab}>Address
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          <input value={s.slug} onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} maxLength={40} style={{ ...input, width: 240 }} />
          <span>.tlgb.co.uk</span>
        </span>
        <span className="muted small" style={{ fontWeight: 400 }}>Changing it breaks any links you have already shared.</span>
      </label>

      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 600, marginBottom: 6 }}>Colours</legend>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {themes.map((t) => (
            <label key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 8, border: `2px solid ${s.theme === t.key ? t.dark : '#ddd'}`, padding: '8px 12px', cursor: 'pointer', borderRadius: 6 }}>
              <input type="radio" checked={s.theme === t.key} onChange={() => set({ theme: t.key })} style={{ width: 'auto' }} />
              <span style={{ width: 18, height: 18, background: t.dark, borderRadius: 4 }} /><span style={{ width: 18, height: 18, background: t.accent, borderRadius: 4 }} />{t.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label style={lab}>Headline<input value={s.headline} onChange={(e) => set({ headline: e.target.value })} maxLength={120} style={input} /></label>
      <label style={lab}>Introduction <span className="muted small" style={{ fontWeight: 400 }}>One or two sentences under the headline.</span>
        <textarea value={s.intro} onChange={(e) => set({ intro: e.target.value })} maxLength={400} rows={2} style={input} /></label>
      <label style={lab}>About you <span className="muted small" style={{ fontWeight: 400 }}>Leave a blank line between paragraphs.</span>
        <textarea value={s.about} onChange={(e) => set({ about: e.target.value })} maxLength={3000} rows={6} style={input} /></label>

      <fieldset style={{ border: '1px solid var(--line)', padding: 12 }}>
        <legend style={{ fontWeight: 600 }}>Services (up to 6)</legend>
        <div style={{ display: 'grid', gap: 8 }}>
          {s.services.map((sv, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1fr) 2.5fr', gap: 8 }}>
              <input placeholder="Title" value={sv.title} maxLength={60} style={input} onChange={(e) => set({ services: s.services.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
              <input placeholder="One sentence" value={sv.text} maxLength={300} style={input} onChange={(e) => set({ services: s.services.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} />
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset style={{ border: '1px solid var(--line)', padding: 12 }}>
        <legend style={{ fontWeight: 600 }}>Why choose you (up to 5 short points)</legend>
        <div style={{ display: 'grid', gap: 8 }}>
          {s.reasons.map((r, i) => <input key={i} value={r} maxLength={200} style={input} onChange={(e) => set({ reasons: s.reasons.map((x, j) => (j === i ? e.target.value : x)) })} />)}
        </div>
      </fieldset>

      <label style={lab}>Where you work<input value={s.areas} onChange={(e) => set({ areas: e.target.value })} maxLength={300} style={input} /></label>

      {photos.length > 0 && (
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 600, marginBottom: 6 }}>Main photo <span className="muted small" style={{ fontWeight: 400 }}>All your listing photos appear on the Services &amp; work page. Add more from your listing page.</span></legend>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {photos.map((p) => (
              <label key={p.path} style={{ cursor: 'pointer', border: `3px solid ${s.hero_photo === p.path ? 'var(--rust)' : 'transparent'}`, borderRadius: 6 }}>
                <input type="radio" checked={s.hero_photo === p.path} onChange={() => set({ hero_photo: p.path })} style={{ display: 'none' }} />
                <img src={p.url} alt="" style={{ width: 120, height: 90, objectFit: 'cover', display: 'block', borderRadius: 3 }} />
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={s.show_phone} onChange={(e) => set({ show_phone: e.target.checked })} style={{ width: 'auto' }} /> Show my phone number</label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={s.show_email} onChange={(e) => set({ show_email: e.target.checked })} style={{ width: 'auto' }} /> Show my email address</label>
      </div>

      {error && <p className="err big">{error}</p>}
      {msg && <p className="ok-box">{msg}</p>}
      <div><button type="submit" className="sq sq-rust" disabled={!!busy}>{busy === 'save' ? 'Saving...' : 'Save changes'}</button></div>
    </form>
  );
}

export function PublishButtons({ businessId, live }: { businessId: string; live: boolean }) {
  const [busy, setBusy] = useState(false);
  async function go(action: string) {
    if (action === 'unpublish' && !confirm('Take your website offline? You can publish it again at any time.')) return;
    setBusy(true);
    const j = await call({ businessId, action });
    if (j.ok) window.location.reload(); else { alert(j.error); setBusy(false); }
  }
  return live
    ? <button type="button" className="sq" style={{ background: '#777' }} disabled={busy} onClick={() => go('unpublish')}>Take offline</button>
    : <button type="button" className="sq sq-rust" disabled={busy} onClick={() => go('publish')}>{busy ? 'Publishing...' : 'Publish my website'}</button>;
}
