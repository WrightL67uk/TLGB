/** @type {import('next').NextConfig} */
const securityHeaders = [
  // Stop other sites showing our pages inside theirs (clickjacking)
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), payment=(), usb=(), geolocation=(self)' },
];

const nextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  async redirects() {
    return [
      // The Help board was renamed the Help Hub; old links keep working.
      { source: '/help-board', destination: '/help-hub', permanent: true },
      { source: '/help-board/:path*', destination: '/help-hub/:path*', permanent: true },
      // Workers was renamed Recruitment.
      { source: '/workers', destination: '/recruitment', permanent: true },
      { source: '/workers/:path*', destination: '/recruitment/:path*', permanent: true },
      { source: '/guides/help-board-and-workers', destination: '/guides/help-hub-and-recruitment', permanent: true },
    ];
  },
};
export default nextConfig;
