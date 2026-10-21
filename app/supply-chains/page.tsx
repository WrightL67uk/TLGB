import Link from 'next/link';
import '../resources.css';
import { GROUP_HELP, GROUP_LABEL, SUPPLY_CHAINS, type ChainGroup } from '@/lib/supplyChains';
import { shortUrl } from '@/lib/resources';
import { getMembership } from '@/lib/membership';

export const metadata = {
  title: 'Supply chain finder | The Little Green Book',
  description: 'Where to register with main contractors, housebuilders, tender portals and frameworks to get onto their approved supplier lists.',
};

type SP = Promise<{ q?: string; group?: string }>;
const GROUPS = Object.keys(GROUP_LABEL) as ChainGroup[];

export const dynamic = 'force-dynamic';


export default async function SupplyChainsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const m = await getMembership();
  if (!m.paid) return <MembersOnly loggedIn={m.loggedIn} approved={m.approved} unpaidId={m.unpaidId} />;
  const q = (sp.q ?? '').trim().toLowerCase().slice(0, 80);
  const group = GROUPS.includes(sp.group as ChainGroup) ? (sp.group as ChainGroup) : '';
  const rows = SUPPLY_CHAINS.filter(
    (r) => (!group || r.group === group) && (!q || `${r.name} ${r.note} ${r.needs ?? ''}`.toLowerCase().includes(q))
  );

  return (
    <div>
      <h1>Supply chain finder</h1>
      <p className="lead">
        Where to register to get onto approved supplier lists: main contractors, housebuilders, tender portals, frameworks and
        the accreditations they ask for. Read <Link href="/guides/winning-tenders">winning tenders and PQQs</Link> first if you are new to this.
      </p>

      <form className="res-filters" method="get" action="/supply-chains">
        <label>Search
          <input type="search" name="q" defaultValue={sp.q ?? ''} placeholder="e.g. Kier, Constructionline, housing" />
        </label>
        <label>Type
          <select name="group" defaultValue={group}>
            <option value="">Everything</option>
            {GROUPS.map((g) => <option key={g} value={g}>{GROUP_LABEL[g]}</option>)}
          </select>
        </label>
        <button type="submit" className="sq sq-rust">search</button>
        {(q || group) && <Link href="/supply-chains">clear</Link>}
      </form>

      {!rows.length && <p className="muted">Nothing matches that search.</p>}

      {GROUPS.filter((g) => rows.some((r) => r.group === g)).map((g) => (
        <section key={g} className="res-group">
          <h2>{GROUP_LABEL[g]}</h2>
          <p>{GROUP_HELP[g]}</p>
          <div className="res-list">
            {rows.filter((r) => r.group === g).map((r) => (
              <div key={r.name} className="res-card">
                <h3>{r.name}</h3>
                <p>{r.note}</p>
                <p className="res-meta">
                  <a href={r.url} target="_blank" rel="noopener">{shortUrl(r.url)}</a>
                  {r.needs && <span>Asks for: {r.needs}</span>}
                  {r.code && <span>Published sign-up code: <span className="code">{r.code}</span></span>}
                </p>
              </div>
            ))}
          </div>
        </section>
      ))}

      <p className="muted small" style={{ marginTop: 32 }}>
        Links checked October 2026. Sign-up codes are the ones each buyer published on Constructionline and can change.
        Know a supply chain page that should be here? Email it to us and we will add it.
      </p>
    </div>
  );
}

function MembersOnly({ loggedIn, approved, unpaidId }: { loggedIn: boolean; approved: boolean; unpaidId: string | null }) {
  return (
    <div>
      <h1>Supply chain finder</h1>
      <p className="lead">
        Where to register to get onto approved supplier lists: main contractors, housebuilders, tender portals, frameworks and
        the accreditations they ask for. Included with every paid Little Green Book membership.
      </p>
      <div className="lead-gate" style={{ margin: '0 0 24px' }}>
        <h2>{SUPPLY_CHAINS.length} supply chain and tender links for members</h2>
        <p>
          {!loggedIn
            ? 'List your business to get the supply chain finder, the full leads feed and the help board.'
            : approved
              ? 'Start your membership to use the supply chain finder.'
              : 'Your listing needs to be approved before you can start your membership.'}
        </p>
        <div className="gate-btns">
          {loggedIn
            ? <Link href={unpaidId ? `/account/${unpaidId}` : '/account'} className="sq sq-rust">{approved ? 'start membership' : 'check my listing'}</Link>
            : <>
                <Link href="/join" className="sq sq-rust">list your business</Link>
                <Link href="/login?next=/supply-chains" className="sq sq-ghost">log in</Link>
              </>}
        </div>
      </div>
      {GROUPS.map((g) => {
        const rows = SUPPLY_CHAINS.filter((r) => r.group === g);
        return (
          <section key={g} className="res-group">
            <h2>{GROUP_LABEL[g]} <span className="muted small">({rows.length})</span></h2>
            <p>{GROUP_HELP[g]}</p>
          </section>
        );
      })}
      <p>Free reading: <Link href="/guides/winning-tenders">winning tenders and PQQs</Link>.</p>
    </div>
  );
}
