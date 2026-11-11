import ComingSoon from '../ComingSoon';

export const metadata = {
  title: 'Join the waiting list | The Little Green Book',
  description: 'Join the waiting list for The Little Green Book: a one-time launch discount and the chance to join before anyone else.',
};

/** The waiting list on its own address, so the trade show QR code keeps working whatever the homepage shows. */
export default async function WaitlistPage({ searchParams }: { searchParams: Promise<{ joined?: string; already?: string; error?: string; src?: string }> }) {
  const sp = await searchParams;
  const src = sp.src?.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30) || undefined;
  return <ComingSoon joined={!!sp.joined} already={!!sp.already} error={sp.error?.slice(0, 200)} from="/waitlist" src={src} />;
}
