import Link from 'next/link';
import type { Me } from '@/lib/contractors';

const TABS = [
  { key: 'home', href: '/contractor', label: 'Dashboard' },
  { key: 'shortlist', href: '/contractor/shortlist', label: 'Shortlist' },
  { key: 'jobs', href: '/contractor/jobs', label: 'Jobs' },
  { key: 'team', href: '/contractor/team', label: 'Team' },
];

export default function ContractorNav({ me, on }: { me: Me; on: string }) {
  return (
    <>
      <div className="ct-head">
        <div>
          <h1>{me.company.name}</h1>
          <p className="ct-sub">{me.user.name} &middot; {me.user.email} &middot; {me.can.label} plan{me.company.founding ? ' (founding contractor)' : ''}</p>
        </div>
        <form action="/api/auth/logout" method="post"><button type="submit">Log out</button></form>
      </div>
      {me.company.status === 'pending' && (
        <p className="ct-banner">We are checking your company, usually within one working day. You can search trades and build your shortlist now. Posting jobs opens once you are approved.</p>
      )}
      {me.company.status === 'suspended' && (
        <p className="ct-banner">This account is suspended, so jobs are hidden and new ones cannot be posted. Reply to any of our emails to sort it out.</p>
      )}
      <nav className="ct-nav">
        {TABS.map((t) => <Link key={t.key} href={t.href} className={t.key === on ? 'on' : ''}>{t.label}</Link>)}
        <Link href="/search">Find trades</Link>
      </nav>
    </>
  );
}
