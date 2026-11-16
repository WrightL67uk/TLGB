import { cleanSoil, soilLines } from '@/lib/soil';

/** Soil details a supplier has given and TLGB has checked. Only used for suppliers whose soil check is approved. */
export default function SoilPanel({ soil, checkedAt, lastTest, name }: { soil: unknown; checkedAt: string | null; lastTest: string | null; name: string }) {
  const lines = soilLines(cleanSoil(soil));
  if (!lines.length) return null;
  const date = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <section className="panel" style={{ marginTop: 16 }}>
      <h2 style={{ marginTop: 0 }}>Soil quality <span className="badge ok">Soil tests checked</span></h2>
      <dl className="sup-facts">{lines.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}{lastTest && <div><dt>Latest test result seen</dt><dd>{date(lastTest)}</dd></div>}</dl>
      <p className="muted small" style={{ margin: '8px 0 0' }}>
        The answers above come from {name}. We have seen the test certificates they uploaded{checkedAt ? ` and checked them on ${date(checkedAt)}` : ''}. This is not a guarantee for any one load, so ask for the certificate for the batch you are buying.
      </p>
    </section>
  );
}
