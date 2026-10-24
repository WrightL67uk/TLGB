'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export type MenuItem = { label: string; href: string; note: string; tag?: string; download?: boolean; k?: string };
export type MenuSection = { title: string; intro?: string; items: MenuItem[] };

export default function MenuList({ sections, loggedIn }: { sections: MenuSection[]; loggedIn: boolean }) {
  const [q, setQ] = useState('');
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);

  const shown = useMemo(() => sections
    .map((s) => ({
      ...s,
      items: s.items.filter((i) => {
        const hay = `${s.title} ${i.label} ${i.note} ${i.k ?? ''} ${i.href.replace(/[-/_?=#]/g, ' ')}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      }),
    }))
    .filter((s) => s.items.length), [sections, words.join(' ')]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="menu-search">
        <label htmlFor="menu-q">Search the site</label>
        <input id="menu-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. RAMS, insurance, tenders, turf" autoComplete="off" />
      </div>

      {!q && (
        <nav className="menu-jump" aria-label="Sections">
          {sections.map((s) => <a key={s.title} href={`#${slug(s.title)}`}>{s.title}</a>)}
        </nav>
      )}

      {shown.length === 0 && (
        <p className="menu-none">Nothing matches &ldquo;{q}&rdquo;. Try another word, or ask on the <Link href="/help-board">help board</Link>.</p>
      )}

      {shown.map((s) => (
        <section key={s.title} className="menu-sec" id={slug(s.title)}>
          <h2>{s.title}</h2>
          {s.intro && <p className="muted small">{s.intro}</p>}
          <ul className="menu-grid">
            {s.items.map((i) => (
              <li key={i.label}>
                {i.download
                  ? <a href={i.href} className="menu-card"><Card i={i} /></a>
                  : <Link href={i.href} className="menu-card"><Card i={i} /></Link>}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {!loggedIn && <p className="muted small menu-foot">Already listed? <Link href="/login">Log in</Link> to open your member tools.</p>}
    </>
  );
}

function Card({ i }: { i: MenuItem }) {
  return (
    <>
      <span className="menu-label">
        {i.label}
        {i.download && <span className="menu-dl"> (download)</span>}
      </span>
      {i.tag && <span className="menu-tag">{i.tag}</span>}
      <span className="menu-note">{i.note}</span>
    </>
  );
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
