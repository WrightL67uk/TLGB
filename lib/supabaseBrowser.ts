'use client';

/**
 * Uploads a file straight from the browser to Supabase Storage using a
 * one-time signed upload URL made by our server. Plain fetch on purpose:
 * the Supabase JS client added headers that browsers blocked on this route.
 */
export async function uploadToSignedUrl(signedUrl: string, file: File): Promise<void> {
  const body = new FormData();
  body.append('cacheControl', '3600');
  body.append('', file);

  let res: Response;
  try {
    res = await fetch(signedUrl, { method: 'PUT', body, headers: { 'x-upsert': 'false' } });
  } catch {
    throw new Error(`Upload failed for ${file.name}. Check your connection and try again.`);
  }
  if (!res.ok) {
    let reason = '';
    try { reason = (await res.json()).message ?? ''; } catch { /* not JSON */ }
    throw new Error(`Upload failed for ${file.name}${reason ? ` (${reason})` : ''}. Please try again.`);
  }
}
