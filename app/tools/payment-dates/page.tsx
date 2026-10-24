import Link from 'next/link';
import Calculator from './Calculator';
import { getMembership } from '@/lib/membership';
import '../../resources.css';
import '../../pay.css';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Construction Act payment dates calculator | The Little Green Book',
  description: 'Work out the due date, payment notice deadline, pay less notice deadline and final date for payment on a construction application, under the Scheme or your own subcontract terms. Free.',
};

export default async function PaymentDatesPage() {
  const m = await getMembership();
  const baseRate = Number(process.env.LATE_PAYMENT_BASE_RATE || 3.75);
  return (
    <article className="guide pay-guide">
      <h1>Payment dates calculator</h1>
      <p className="lead">Enter your application date and see every deadline that matters under the Construction Act: when the payment notice is due, the last day for a pay less notice, the final date for payment, and when you can suspend.</p>
      <Calculator baseRate={baseRate} />
      <div className="pay-cta">
        {m.paid
          ? <p><strong>Track every application automatically.</strong> Your payment tracker remembers each job&rsquo;s terms, warns you before deadlines, and writes the notices for you. <Link href="/account/payments">Open my payment tracker</Link></p>
          : <p><strong>Members get a payment tracker</strong> that remembers each job&rsquo;s terms, emails you when a payment notice is missed or a payment is late, tracks retentions, and writes the notices for you. <Link href="/join">List your business</Link></p>}
      </div>
      <h2>How the dates work</h2>
      <p>Every construction contract must say when payments become due and the final date for payment. If it does not, or the terms do not comply with the Act, the Scheme for Construction Contracts fills the gap:</p>
      <ul>
        <li><strong>Due date:</strong> 7 days after the end of the payment period, or the date you apply, whichever is later.</li>
        <li><strong>Payment notice:</strong> the paying party must say what they will pay, and how it is worked out, within 5 days after the due date.</li>
        <li><strong>No payment notice?</strong> If your application was made in line with the contract, the amount you applied for becomes the sum due. If not, you can send your own notice, and the final date moves back by the same number of days you were late.</li>
        <li><strong>Pay less notice:</strong> to pay less than the notified sum, they must send a pay less notice no later than 7 days before the final date (or the period your contract sets).</li>
        <li><strong>Final date for payment:</strong> 17 days after the due date under the Scheme. Your contract may set a different period.</li>
        <li><strong>Suspension:</strong> if the sum due is not paid by the final date, you may suspend work after giving at least 7 days&rsquo; written notice of your intention and the grounds.</li>
        <li><strong>Counting days:</strong> under the Act, Christmas Day, Good Friday and bank holidays in England and Wales are left out.</li>
        <li><strong>Late payment interest:</strong> unless the contract gives a substantial remedy of its own, you can claim interest at 8% over the Bank of England reference rate, plus £40, £70 or £100 fixed compensation depending on the size of the debt.</li>
      </ul>
      <p className="muted small">This is general guidance on the law in England and Wales, not legal advice. Scotland has its own Scheme with similar rules. Always check your subcontract: its own payment terms apply if they meet the Act. Get advice before suspending work.</p>
    </article>
  );
}
