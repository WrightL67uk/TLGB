import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/supabase';
import { sameOrigin } from '@/lib/session';
import { getContractor, ownJob, isUuid } from '@/lib/contractors';

// Drawings and documents on a job. The browser uploads straight to private storage with a
// one-time link (prepare), then we record the file (save). Delete removes both.

export const runtime = 'nodejs';

const JOB_FILE_EXT = ['pdf', 'jpg', 'jpeg', 'png', 'zip', 'xlsx', 'xls', 'csv', 'docx', 'doc', 'dwg', 'dxf'];
const MAX_BYTES = 25 * 1024 * 1024;
const MAX_FILES = 15;
const BUCKET = 'contractor-jobs';

const Body = z.discriminatedUnion('op', [
  z.object({ op: z.literal('prepare'), jobId: z.string(), name: z.string().min(1).max(200), size: z.number().int().positive() }),
  z.object({ op: z.literal('save'), jobId: z.string(), path: z.string().min(10).max(300), name: z.string().min(1).max(200), type: z.string().max(120), size: z.number().int().positive() }),
  z.object({ op: z.literal('delete'), jobId: z.string(), fileId: z.string() }),
]);

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const ext = (name: string) => (name.split('.').pop() ?? '').toLowerCase();

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail('Request blocked.', 403);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const p = parsed.data;
  const me = await getContractor();
  if (!me) return fail('Please log in again.', 401);
  const job = await ownJob(me, p.jobId);
  if (!job) return fail('That job could not be found.', 404);

  if (p.op === 'prepare') {
    if (!JOB_FILE_EXT.includes(ext(p.name))) return fail(`${p.name}: files must be PDF, images, Word, Excel, ZIP or CAD (DWG/DXF).`);
    if (p.size > MAX_BYTES) return fail(`${p.name} is over 25MB. Use a documents link for bigger files.`);
    const { count } = await db().from('contractor_job_files').select('id', { count: 'exact', head: true }).eq('job_id', job.id);
    if ((count ?? 0) >= MAX_FILES) return fail(`Up to ${MAX_FILES} files per job. Use a documents link for more.`);
    const path = `${job.id}/${crypto.randomUUID()}.${ext(p.name)}`;
    const signed = await db().storage.from(BUCKET).createSignedUploadUrl(path);
    if (signed.error) return fail('Could not prepare the upload. Try again.', 500);
    return NextResponse.json({ ok: true, path, signedUrl: signed.data.signedUrl });
  }

  if (p.op === 'save') {
    if (!p.path.startsWith(`${job.id}/`) || p.path.includes('..')) return fail('Invalid upload.');
    if (p.size > MAX_BYTES || !JOB_FILE_EXT.includes(ext(p.name))) return fail('Invalid file.');
    const fileName = p.path.split('/').pop()!;
    const { data: objs } = await db().storage.from(BUCKET).list(job.id, { search: fileName, limit: 5 });
    if (!(objs ?? []).some((o) => o.name === fileName)) return fail(`${p.name} did not finish uploading. Try again.`);
    const { error } = await db().from('contractor_job_files').insert({
      job_id: job.id, storage_path: p.path, file_name: p.name, mime_type: p.type || 'application/octet-stream', size_bytes: p.size,
    });
    if (error) return fail('Could not save the file. Try again.', 500);
    return NextResponse.json({ ok: true });
  }

  if (!isUuid(p.fileId)) return fail('File not found.');
  const { data: f } = await db().from('contractor_job_files').select('id, storage_path').eq('id', p.fileId).eq('job_id', job.id).maybeSingle();
  if (!f) return fail('File not found.', 404);
  await db().storage.from(BUCKET).remove([f.storage_path]);
  await db().from('contractor_job_files').delete().eq('id', f.id);
  return NextResponse.json({ ok: true });
}
