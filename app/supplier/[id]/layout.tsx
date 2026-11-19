import { requireRole } from '@/lib/roles';

export default async function RoleLayout({ children }: { children: React.ReactNode }) {
  await requireRole('supplier');
  return children;
}
