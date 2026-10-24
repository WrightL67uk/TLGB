import { NextRequest, NextResponse } from 'next/server';
import { packOwner } from '@/lib/compliance';
import { loadPqq, autoAnswers } from '@/lib/pqqServer';
import { answerBlocks, money, projectDates } from '@/lib/pqqRender';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const para = (s: string) => esc(s).replace(/\n/g, '<br>');

/** The member's answers as one Word document, for contractors who send their own form. */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('b') ?? '';
  const own = await packOwner(id);
  if (!own.ok) return NextResponse.redirect(new URL(own.status === 401 ? '/login' : '/account', req.url), 303);
  const b = own.business;
  const { answers, projects } = await loadPqq(b.id);
  const blocks = answerBlocks(answers, await autoAnswers(b), { finance: true });

  let html = '';
  let section = '';
  for (const bl of blocks) {
    if (bl.section !== section) { section = bl.section; html += `<h2>${esc(section)}</h2>`; }
    html += `<p class="q">${esc(bl.q)}</p>`;
    if (bl.kind === 'yesno') html += `<p><b>${bl.yes ? 'Yes' : 'No'}</b>${bl.text ? `. ${para(bl.text)}` : ''}</p>`;
    else if (bl.kind === 'figures' && bl.table) {
      html += `<table><tr>${bl.table.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>${bl.table.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`;
    } else html += `<p>${para(bl.text ?? '')}</p>`;
  }
  if (projects.length) {
    html += '<h2>Project references</h2>';
    for (const p of projects) {
      html += `<h3>${esc(p.title)}</h3><p>${[p.client && `Client: ${esc(p.client)}`, p.location && `Location: ${esc(p.location)}`, p.value_gbp != null && `Value: ${money(p.value_gbp)}`, projectDates(p) && `Dates: ${projectDates(p)}`].filter(Boolean).join('<br>')}</p>`;
      if (p.scope) html += `<p><b>Scope.</b> ${para(p.scope)}</p>`;
      if (p.outcome) html += `<p><b>Outcome.</b> ${para(p.outcome)}</p>`;
      if (p.ref_name) html += `<p><b>Reference.</b> ${esc([p.ref_name, p.ref_role].filter(Boolean).join(', '))}${p.ref_email ? `, ${esc(p.ref_email)}` : ''}${p.ref_phone ? `, ${esc(p.ref_phone)}` : ''}</p>`;
    }
  }

  const doc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(b.trading_name)} company profile</title>
<style>body{font-family:Arial,sans-serif;font-size:11pt;color:#1b1f1c}h1{font-size:20pt;color:#12361f}h2{font-size:14pt;color:#12361f;border-bottom:1px solid #7bb342;margin-top:18pt}h3{font-size:12pt;color:#12361f}
.q{font-weight:bold;margin-bottom:2pt}table{border-collapse:collapse;margin:4pt 0}th,td{border:1px solid #999;padding:3pt 8pt;font-size:10pt}th{background:#e9f2e2}</style></head><body>
<h1>${esc(b.trading_name)}: company profile</h1>
<p>Prequalification information, prepared ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
${html}
</body></html>`;
  const file = `${b.trading_name.replace(/[^A-Za-z0-9 ]+/g, '').trim()} company profile.doc`;
  return new NextResponse(doc, {
    headers: { 'content-type': 'application/msword; charset=utf-8', 'content-disposition': `attachment; filename="${file}"`, 'cache-control': 'private, no-store' },
  });
}
