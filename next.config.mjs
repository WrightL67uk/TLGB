/** @type {import('next').NextConfig} */
const nextConfig = {
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
