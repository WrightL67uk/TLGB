import 'server-only';
import { randomBytes } from 'crypto';
import { db } from './supabase';
import { ownedBusiness, type Business } from './account';
import { isPaid } from './membership';
import { docType, type DocStatus } from './complianceTypes';

const categoryOf = (key: string) => docType(key)?.category ?? 'company';

export const BUCKET = 'compliance';

export type PackDoc = {
  id: string;
  business_id: string;
  doc_type: string;
  title: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  expiry: string | null;
  reviewed_on: string | null;
  status: DocStatus;
  reject_reason: string | null;
  replaces: string | null;
  checked_at: string | null;
  created_at: string;
};

export type PackLink = {
  id: string;
  business_id: string;
  token: string;
  label: string;
  include: string[];
  expires_at: string | null;
  revoked_at: string | null;
  open_count: number;
  last_opened_at: string | null;
  created_at: string;
};

type PackOwner =
  | { ok: true; email: string; business: Business }
  | { ok: false; status: number; error: string };

/** The listing, if it belongs to the logged-in trade and has a paid (or founding) membership. */
export async function packOwner(id: string): Promise<PackOwner> {
  const own = await ownedBusiness(id);
  if (!own.ok) return own;
  if (!isPaid(own.business)) return { ok: false, status: 403, error: 'The compliance pack is part of a paid membership.' };
  return own;
}

/** Every document that has not been replaced or deleted. */
export async function currentDocs(businessId: string): Promise<PackDoc[]> {
  const { data } = await db()
    .from('compliance_docs')
    .select('*')
    .eq('business_id', businessId)
    .is('archived_at', null)
    .order('created_at');
  return (data ?? []) as PackDoc[];
}

/** What contractors can see: checked insurance and accreditations, plus the member's own documents. */
export const contractorVisible = (d: PackDoc) => d.status === 'checked' || d.status === 'provided';

export async function linkByToken(token: string): Promise<PackLink | null> {
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(token)) return null;
  const { data } = await db().from('pack_links').select('*').eq('token', token).maybeSingle();
  return (data as PackLink | null) ?? null;
}

export const linkLive = (l: PackLink) => !l.revoked_at && (!l.expires_at || new Date(l.expires_at) > new Date());

/** A link token: random part plus a readable tail from the label. */
export function newToken(label: string) {
  const tail = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
  const rand = randomBytes(6).toString('base64url').replace(/[-_]/g, 'x').slice(0, 6).toLowerCase();
  return tail ? `${rand}-${tail}` : rand;
}

/** Short-lived download link that saves under the original file name. */
export async function signedDownload(path: string, fileName: string, seconds = 120) {
  const { data } = await db().storage.from(BUCKET).createSignedUrl(path, seconds, { download: fileName });
  return data?.signedUrl ?? null;
}

/** Retire a document: hide it everywhere and delete the file. */
export async function archiveDocs(ids: string[]) {
  if (!ids.length) return;
  const { data } = await db().from('compliance_docs').update({ archived_at: new Date().toISOString() }).in('id', ids).select('storage_path');
  const paths = (data ?? []).map((r) => r.storage_path as string);
  if (paths.length) await db().storage.from(BUCKET).remove(paths);
}

export type OpenPack =
  | { ok: true; link: PackLink; business: Business; docs: PackDoc[] }
  | { ok: false; reason: 'missing' | 'off' | 'unavailable' };

/** Everything a contractor's link can show, or why it can't. */
export async function openPack(token: string): Promise<OpenPack> {
  const link = await linkByToken(token);
  if (!link) return { ok: false, reason: 'missing' };
  if (!linkLive(link)) return { ok: false, reason: 'off' };
  const { data: b } = await db().from('businesses').select('*').eq('id', link.business_id).maybeSingle();
  if (!b || !isPaid(b as Business)) return { ok: false, reason: 'unavailable' };
  const docs = (await currentDocs(link.business_id)).filter(
    (d) => contractorVisible(d) && link.include.includes(categoryOf(d.doc_type)),
  );
  return { ok: true, link, business: b as Business, docs };
}

export async function logPackEvent(link: PackLink, kind: 'open' | 'download' | 'zip', detail?: string) {
  await db().from('pack_events').insert({ link_id: link.id, business_id: link.business_id, kind, detail: detail?.slice(0, 500) ?? null });
  if (kind === 'open') {
    await db().from('pack_links').update({ open_count: link.open_count + 1, last_opened_at: new Date().toISOString() }).eq('id', link.id);
  }
}
