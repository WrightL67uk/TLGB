import Link from 'next/link';
import '../../resources.css';
import { SUPPLIER_CATEGORIES } from '@/lib/resources';

export const metadata = { title: 'List your supply business | The Little Green Book' };

export default async function AddSupplierPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const { sent, error } = await searchParams;
  return (
    <article className="guide">
      <h1>List your supply business</h1>
      <p className="lead">Free listing on the supplier page. We check every submission before it goes live.</p>
      {sent ? (
        <p className="ok-box"><strong>Thanks.</strong> We will check the details and let you know when you are live. <Link href="/suppliers">Back to suppliers</Link></p>
      ) : (
        <form className="res-form" method="post" action="/api/suppliers">
          {error && <p className="err big">{error}</p>}
          <label>Business name<input name="name" required maxLength={160} /></label>
          <div>
            <strong>What do you supply?</strong>
            <div className="checks">
              {SUPPLIER_CATEGORIES.map((c) => <label key={c.key}><input type="checkbox" name="categories" value={c.key} /> {c.label}</label>)}
            </div>
          </div>
          <label>Short description<textarea name="description" required maxLength={400} placeholder="What you supply and who to, in a sentence or two" /></label>
          <div className="row">
            <label>Website<input name="website" maxLength={200} placeholder="www.example.co.uk" /></label>
            <label>Phone<input name="phone" maxLength={30} /></label>
          </div>
          <div className="row">
            <label>Town<input name="town" maxLength={80} /></label>
            <label>Postcode of your yard or depot<input name="postcode" maxLength={10} /></label>
          </div>
          <label className="checks" style={{ fontWeight: 400 }}><input type="checkbox" name="delivers_nationally" value="1" /> We deliver nationally</label>
          <label>Your email (not shown on the site)<input name="email" type="email" required maxLength={200} /></label>
          <label className="hp" aria-hidden="true">Leave this empty<input name="company_url" tabIndex={-1} autoComplete="off" /></label>
          <button type="submit" className="primary">submit for checking</button>
        </form>
      )}
    </article>
  );
}
