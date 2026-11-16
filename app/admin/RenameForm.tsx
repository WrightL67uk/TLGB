/** Admin only. Changes the name shown for a trade or supplier. Links to their page do not change. */
export default function RenameForm({ kind, id, name, from }: { kind: 'business' | 'supplier'; id: string; name: string; from: string }) {
  return (
    <details style={{ display: 'inline-block' }}>
      <summary style={{ cursor: 'pointer', fontSize: '.9rem' }}>Edit name</summary>
      <form method="post" action="/api/admin/rename" style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="from" value={from} />
        <input name="name" defaultValue={name} required maxLength={120} style={{ minWidth: 260 }} aria-label="Company name" />
        <button type="submit">Save name</button>
      </form>
    </details>
  );
}
