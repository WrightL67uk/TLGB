import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { claudeAllowed, READABLE, HIDDEN_COLUMNS } from '@/lib/claudeAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OPS = new Set(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is']);

/**
 * GET /api/claude/query?table=businesses&select=id,trading_name&f=status.eq.approved&f=trading_name.ilike.*wright*&order=created_at.desc&limit=50
 * Read-only. Unknown callers get a plain 404.
 */
export async function GET(req: NextRequest) {
  if (!claudeAllowed(req)) return new NextResponse('Not found', { status: 404 });
  const sp = req.nextUrl.searchParams;
  const table = sp.get('table') ?? '';
  if (!READABLE.has(table)) return NextResponse.json({ error: `Table not readable. Allowed: ${Array.from(READABLE).join(', ')}` }, { status: 400 });
  const select = sp.get('select') || '*';
  if (!/^[\w,*\s()!:.-]+$/.test(select)) return NextResponse.json({ error: 'Bad select' }, { status: 400 });
  const limit = Math.min(Math.max(Number(sp.get('limit')) || 50, 1), 500);
  let q = db().from(table).select(select, { count: 'exact' }).limit(limit);
  for (const f of sp.getAll('f')) {
    const m = f.match(/^(\w+)\.(\w+)\.(.*)$/);
    if (!m || !OPS.has(m[2])) return NextResponse.json({ error: `Bad filter "${f}". Use column.op.value with op one of ${Array.from(OPS).join(', ')}` }, { status: 400 });
    const [, col, op, raw] = m;
    const val = op === 'is' ? (raw === 'null' ? null : raw === 'true') : op.endsWith('like') ? raw.replace(/\*/g, '%') : raw;
    q = (q as any)[op](col, val);
  }
  const order = sp.get('order');
  if (order) {
    const [col, dir] = order.split('.');
    if (!/^\w+$/.test(col)) return NextResponse.json({ error: 'Bad order' }, { status: 400 });
    q = q.order(col, { ascending: dir !== 'desc' });
  }
  const { data, error, count } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const rows = ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !HIDDEN_COLUMNS.has(k))));
  return NextResponse.json({ table, count, rows });
}
