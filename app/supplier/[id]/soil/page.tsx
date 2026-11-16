import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ownedSupplier } from '@/lib/supplierAccount';
import { db } from '@/lib/supabase';
import { EMPTY_SOIL, cleanSoil, isSoilSupplier } from '@/lib/soil';
import SoilForm from './SoilForm';
import '../../../resources.css';
import '../../../suppliers/supplier.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Soil quality details | TLGB' };

export default async function SoilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const own = await ownedSupplier(id);
  if (!own.ok) {
    if (own.status === 401) redirect(`/login?next=/supplier/${id}/soil`);
    notFound();
  }
  const s = own.supplier as typeof own.supplier & { soil: unknown; soil_status: string; soil_note: string | null };
  if (s.status === 'rejected') redirect(`/supplier/${s.id}`);
  if (!isSoilSupplier(s.categories)) redirect(`/supplier/${s.id}/details`);
  const { data: docs } = await db().from('supplier_docs').select('id, kind, title, tested_on, file_name, created_at').eq('supplier_id', s.id).order('created_at');
  return (
    <div className="narrow">
      <p className="small"><Link href={`/supplier/${s.id}`}>&larr; Back to my supplier account</Link></p>
      <h1>Soil quality details</h1>
      <p className="muted">
        Contractors want to know the soil they buy is tested and traceable. Answer these questions and upload your test results. We check them by hand, and once approved they show on your listing with a &ldquo;soil tests checked&rdquo; badge.
      </p>
      <SoilForm
        supplierId={s.id}
        status={s.soil_status ?? 'none'}
        note={s.soil_note ?? null}
        initial={s.soil ? cleanSoil(s.soil) : EMPTY_SOIL}
        docs={(docs ?? []).map((x) => ({ id: x.id as string, kind: x.kind as string, title: (x.title as string) ?? '', tested_on: (x.tested_on as string) ?? '', file_name: (x.file_name as string) ?? '' }))}
      />
    </div>
  );
}
