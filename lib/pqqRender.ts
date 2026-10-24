// Turns saved answers into readable blocks, for the Word download and for shared pack links.
import { PQQ, PQQ_SECTIONS, type Answer, type Project, type Question } from './pqq';

export type Block = { section: string; q: string; kind: 'text' | 'yesno' | 'figures'; text?: string; yes?: boolean; table?: { head: string[]; rows: string[][] } };

export function answerBlocks(answers: Answer[], auto: Record<string, string>, opts: { finance: boolean }): Block[] {
  const byKey = new Map(answers.map((a) => [a.key, a]));
  const out: Block[] = [];
  for (const q of PQQ as Question[]) {
    if (q.finance && !opts.finance) continue;
    const section = PQQ_SECTIONS.find((s) => s.key === q.section)!.label;
    if (q.type === 'auto') {
      if (auto[q.key]) out.push({ section, q: q.q, kind: 'text', text: auto[q.key] });
      continue;
    }
    const a = byKey.get(q.key);
    if (!a) continue;
    if (q.type === 'yesno') {
      if (a.data?.yes == null) continue;
      out.push({ section, q: q.q, kind: 'yesno', yes: a.data.yes, text: a.short_text ?? undefined });
    } else if (q.type === 'figures') {
      const years = a.data?.years ?? [];
      const rows = (q.rows ?? []).map((r) => [r, ...((a.data?.values?.[r] ?? []).map((v) => v || '-'))]);
      if (!rows.some((r) => r.slice(1).some((v) => v !== '-'))) continue;
      out.push({ section, q: q.q, kind: 'figures', table: { head: ['', ...years], rows } });
    } else {
      const text = a.long_text || a.short_text;
      if (text) out.push({ section, q: q.q, kind: 'text', text });
    }
  }
  return out;
}

export const money = (n: number | null) => (n == null ? '' : `£${Math.round(n).toLocaleString('en-GB')}`);
const month = (d: string | null) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');
export const projectDates = (p: Project) => [month(p.start_date), month(p.end_date)].filter(Boolean).join(' to ');
