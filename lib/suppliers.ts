import 'server-only';
import { db } from './supabase';

/** Fills in map positions for suppliers that have a postcode but no position yet (runs daily). */
export async function geocodeSuppliers() {
  const { data } = await db().from('suppliers').select('id, postcode').is('lat', null).not('postcode', 'is', null).limit(100);
  if (!data?.length) return 0;
  const res = await fetch('https://api.postcodes.io/postcodes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postcodes: data.map((d) => d.postcode) }),
    signal: AbortSignal.timeout(15_000),
  });
  const json = await res.json().catch(() => null);
  let n = 0;
  for (const r of json?.result ?? []) {
    const p = r?.result;
    const row = data.find((d) => String(d.postcode).toUpperCase() === String(r.query).toUpperCase());
    if (p && row) {
      await db().from('suppliers').update({ lat: p.latitude, lng: p.longitude }).eq('id', row.id);
      n++;
    }
  }
  return n;
}
