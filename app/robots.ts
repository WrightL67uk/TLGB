import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/config';

/** Keep search engines out of private areas; point them at the sitemap. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/account', '/supplier/', '/seeker', '/contractor/', '/login', '/quote/'] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
