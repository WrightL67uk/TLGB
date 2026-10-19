export type PostcodeResult =
  | { ok: true; postcode: string; lat: number; lng: number }
  | { ok: false; reason: string };

/** Free UK postcode lookup via postcodes.io (no key needed). */
export async function lookupPostcode(input: string): Promise<PostcodeResult> {
  const pc = input.trim().toUpperCase();
  if (!pc) return { ok: false, reason: 'Enter a postcode.' };
  const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`, {
    cache: 'no-store',
  });
  if (res.status === 404) return { ok: false, reason: `Postcode "${pc}" not recognised.` };
  if (!res.ok) return { ok: false, reason: 'Postcode lookup failed. Try again shortly.' };
  const { result } = await res.json();
  if (result?.latitude == null) return { ok: false, reason: `No location found for "${pc}".` };
  return { ok: true, postcode: result.postcode, lat: result.latitude, lng: result.longitude };
}
