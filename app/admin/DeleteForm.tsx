/** Permanent delete for admin pages. The tick box stops a stray click deleting anyone. */
export default function DeleteForm({ kind, id, name, from, what }: { kind: 'business' | 'supplier' | 'seeker' | 'contractor'; id: string; name: string; from: string; what: string }) {
  return (
    <details style={{ display: 'inline-block' }}>
      <summary style={{ cursor: 'pointer', color: 'var(--danger)', fontSize: '.9rem' }}>Delete</summary>
      <form method="post" action="/api/admin/delete" style={{ display: 'grid', gap: 6, marginTop: 6, padding: 10, border: '1px solid #e8c4c4', background: '#fbeaea', maxWidth: 360 }}>
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="from" value={from} />
        <label style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: '.9rem' }}>
          <input type="checkbox" name="confirm" value="yes" required style={{ width: 'auto', marginTop: 3 }} />
          <span>Permanently delete <strong>{name}</strong> and {what}. This cannot be undone.</span>
        </label>
        <button type="submit" style={{ background: 'var(--danger)', color: '#fff', border: 0, padding: '6px 12px', cursor: 'pointer', justifySelf: 'start' }}>Delete permanently</button>
      </form>
    </details>
  );
}
