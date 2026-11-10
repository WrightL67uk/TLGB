import type { Opt } from '@/lib/seekerTypes';

export function Ticks({ name, opts, chosen }: { name: string; opts: Opt[]; chosen: string[] }) {
  return (
    <>
      {opts.map((o) => (
        <label key={o.key}><input type="checkbox" name={name} value={o.key} defaultChecked={chosen.includes(o.key)} /> {o.label}</label>
      ))}
    </>
  );
}

export function Pick({ name, opts, value, empty }: { name: string; opts: Opt[]; value: string | null; empty: string }) {
  return (
    <select name={name} defaultValue={value ?? ''}>
      <option value="">{empty}</option>
      {opts.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
    </select>
  );
}
