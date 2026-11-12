import { redirect } from 'next/navigation';

// The old free submission form is gone: suppliers now choose Appear or Match.
export default function AddSupplierPage() {
  redirect('/suppliers/join');
}
