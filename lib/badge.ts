import { siteUrl } from './config';

// The "Verified member" badge a member can put on their own website, linking back to their listing.
export const BADGE_PATH = '/badge/tlgb-verified-member.png';
export const BADGE_JPG_PATH = '/badge/tlgb-verified-member.jpg';
export const BADGE_W = 240;
export const BADGE_H = 67;

export function badgeCode(businessId: string) {
  const site = siteUrl();
  return `<a href="${site}/b/${businessId}" title="Verified member of The Little Green Book"><img src="${site}${BADGE_PATH}" alt="Verified member of The Little Green Book, the directory of checked landscaping trades" width="${BADGE_W}" height="${BADGE_H}" style="border:0"></a>`;
}
