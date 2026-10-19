import JoinForm from './JoinForm';

export const metadata = { title: 'List your business | TLGB' };

export default function JoinPage() {
  return (
    <div className="narrow">
      <h1>List your business</h1>
      <p className="lead">
        Every business is checked by hand before it goes live, so contractors know who they are dealing with.
      </p>
      <JoinForm />
    </div>
  );
}
