// Who runs the site, for the legal pages. Set these in Vercel's environment variables so they can
// change without a code update:
//   LEGAL_OPERATOR   e.g. "Ed Wright and Trudy Martin, trading in partnership as The Little Green Book"
//   BUSINESS_POSTAL_ADDRESS   the partnership's postal address
//   ICO_REGISTRATION   the number from paying the ICO data protection fee

import { TLGB_EMAIL } from './config';

export const LEGAL_UPDATED = '24 October 2026';

export function legalDetails() {
  return {
    operator: process.env.LEGAL_OPERATOR?.trim() || 'the partners trading as The Little Green Book',
    address: process.env.BUSINESS_POSTAL_ADDRESS?.trim() || null,
    ico: process.env.ICO_REGISTRATION?.trim() || null,
    email: TLGB_EMAIL,
  };
}
