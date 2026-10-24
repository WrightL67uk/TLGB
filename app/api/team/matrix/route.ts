import { NextRequest, NextResponse } from 'next/server';
import { packOwner } from '@/lib/compliance';
import { loadTeam } from '@/lib/team';
import { QUAL_TYPES, qualStatus } from '@/lib/teamTypes';
import { ukDate } from '@/lib/complianceTypes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const COLOUR = { ok: '#e3f1e6', warn: '#fff1d6', bad: '#fbe1e1', none: '#ffffff' } as const;

/** The training matrix as a Word document: one row per person, one column per card type. */
export async function GET(req: NextRequest) {
  const bid = req.nextUrl.searchParams.get('b') ?? '';
  const numbers = req.nextUrl.searchParams.get('numbers') !== '0';
  if (!/^[0-9a-f-]{36}$/i.test(bid)) return new NextResponse('Not found', { status: 404 });
  const own = await packOwner(bid);
  if (!own.ok) return NextResponse.redirect(new URL(own.status === 401 ? '/login' : `/account/${bid}`, req.url), 303);
  const b = own.business;
  const team = await loadTeam(bid);

  const used = QUAL_TYPES.filter((t) => team.some((p) => p.quals.some((q) => q.qual_type === t.key)));
  const head = `<tr><th>Name</th><th>Role</th>${used.map((t) => `<th>${esc(t.label)}</th>`).join('')}</tr>`;
  const rows = team.map((p) => `<tr><td><b>${esc(p.name)}</b></td><td>${esc(p.role ?? '')}</td>${used.map((t) => {
    const mine = p.quals.filter((q) => q.qual_type === t.key);
    if (!mine.length) return '<td></td>';
    const worst = mine.map((q) => qualStatus(q.expiry).tone).sort((x, y) => ['bad', 'warn', 'ok', 'none'].indexOf(x) - ['bad', 'warn', 'ok', 'none'].indexOf(y))[0];
    return `<td style="background:${COLOUR[worst]}">${mine.map((q) => [
      q.detail ? esc(q.detail) : (t.key === 'other' ? '' : 'Yes'),
      numbers && q.number ? `No. ${esc(q.number)}` : '',
      q.expiry ? `${qualStatus(q.expiry).tone === 'bad' ? 'Expired' : 'Exp'} ${ukDate(q.expiry)}` : (q.achieved_on ? `Passed ${ukDate(q.achieved_on)}` : ''),
    ].filter(Boolean).join('<br>')).join('<br><br>')}</td>`;
  }).join('')}</tr>`).join('');

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>Training matrix</title>
<style>@page Section1{size:841.9pt 595.3pt;mso-page-orientation:landscape;margin:36pt}div.Section1{page:Section1}
body{font-family:Arial,sans-serif;font-size:10pt;color:#1b1f1c}h1{font-size:15pt;color:#12361f;margin:0 0 4pt}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:3pt 5pt;vertical-align:top;font-size:8.5pt;text-align:left}th{background:#12361f;color:#fff}
.key span{display:inline-block;padding:1pt 6pt;margin-right:6pt;border:1px solid #999}</style></head><body><div class="Section1">
<h1>${esc(b.trading_name)}: training matrix</h1>
<p>${team.length} ${team.length === 1 ? 'person' : 'people'}. Correct on ${ukDate(new Date().toISOString().slice(0, 10))}.</p>
<p class="key"><span style="background:${COLOUR.ok}">In date</span><span style="background:${COLOUR.warn}">Expires within 60 days</span><span style="background:${COLOUR.bad}">Expired</span></p>
${team.length ? `<table>${head}${rows}</table>` : '<p>No team members added yet.</p>'}
<p style="font-size:8pt;color:#666;margin-top:10pt">Kept in The Little Green Book. Cards and certificates can be seen on request.</p>
</div></body></html>`;
  const name = `Training matrix ${b.trading_name}`.replace(/[^A-Za-z0-9 ]+/g, '').trim().slice(0, 80);
  return new NextResponse(html, {
    headers: { 'content-type': 'application/msword; charset=utf-8', 'content-disposition': `attachment; filename="${name}.doc"`, 'cache-control': 'private, no-store' },
  });
}

