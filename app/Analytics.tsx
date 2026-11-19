'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import Link from 'next/link';

const TAG = 'GTM-W792QM2T';
const KEY = 'tlgb_analytics';

/**
 * Google Analytics, loaded only after the visitor accepts. Nothing is sent
 * and no analytics cookie is set before then (UK PECR). Not used in /admin.
 */
export default function Analytics() {
  const path = usePathname();
  const [choice, setChoice] = useState<'yes' | 'no' | 'unset' | null>(null);

  useEffect(() => {
    let v: string | null = null;
    try { v = localStorage.getItem(KEY); } catch {}
    setChoice(v === 'yes' || v === 'no' ? v : 'unset');
  }, []);

  if (path.startsWith('/admin') || choice === null) return null;

  function decide(v: 'yes' | 'no') {
    try { localStorage.setItem(KEY, v); } catch {}
    setChoice(v);
  }

  return (
    <>
      {choice === 'yes' && (
        <>
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());`}
          </Script>
          <Script src={`https://www.googletagmanager.com/gtm.js?id=${TAG}`} strategy="afterInteractive" />
        </>
      )}
      {choice === 'unset' && (
        <div role="dialog" aria-label="Cookies" style={{ position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 60, maxWidth: 560, margin: '0 auto', background: '#163f27', color: '#fff', padding: '14px 16px', borderRadius: 10, boxShadow: '0 6px 24px rgba(0,0,0,.25)', fontSize: 14, lineHeight: 1.4 }}>
          <p style={{ margin: '0 0 10px' }}>
            We would like to use Google Analytics to see how the site is used. It sets cookies. Nothing is set unless you accept.{' '}
            <Link href="/legal/cookies" style={{ color: '#9ccc65' }}>Cookie policy</Link>
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => decide('yes')} style={{ background: '#9ccc65', color: '#163f27', border: 0, borderRadius: 6, padding: '8px 14px', fontWeight: 700, cursor: 'pointer' }}>Accept</button>
            <button type="button" onClick={() => decide('no')} style={{ background: 'transparent', color: '#fff', border: '1px solid #fff', borderRadius: 6, padding: '8px 14px', cursor: 'pointer' }}>No thanks</button>
          </div>
        </div>
      )}
    </>
  );
}
