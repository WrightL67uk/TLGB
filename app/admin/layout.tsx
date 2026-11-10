import Link from 'next/link';
import { currentAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await currentAdmin().catch(() => null);
  return (
    <>
      {me && (
        <div className="admin-bar">
          <span>Admin: <strong>{me.name}</strong></span>
          <Link href="/admin/admins">Admins</Link>
          <form method="post" action="/api/adminauth/logout"><button type="submit" className="linkish">Log out</button></form>
        </div>
      )}
      {children}
    </>
  );
}
