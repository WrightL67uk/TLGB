import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'TLGB QR',
  robots: { index: false, follow: false },
  manifest: '/qr/manifest.json',
  appleWebApp: { capable: true, title: 'TLGB QR', statusBarStyle: 'black-translucent' },
  icons: { apple: '/qr/qr-icon.png', icon: '/qr/qr-icon-192.png' },
};
export const viewport: Viewport = { themeColor: '#12361f' };

/** Full-screen waiting list QR code to show people at a trade show. Add it to a phone home screen. */
export default function QrPage() {
  return (
    <div className="qr-only">
      <img src="/qr/tlgb-waiting-list-phone.png" alt="QR code: scan to join The Little Green Book waiting list" />
    </div>
  );
}
