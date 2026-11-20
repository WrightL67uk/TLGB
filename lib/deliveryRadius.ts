// How far a supplier delivers from their yard, in miles. Shown as options on the supplier details form.
export const DELIVERY_RADII = [25, 50, 75, 100, 150, 200, 300];

/** True if a supplier reaches this point. Unknown distance or no radius set returns null (not stated). */
export function reaches(s: { delivers_nationally: boolean; delivery_radius_miles?: number | null }, dist: number | null): boolean | null {
  if (s.delivers_nationally) return true;
  if (!s.delivery_radius_miles || dist == null) return null;
  return dist <= s.delivery_radius_miles;
}
