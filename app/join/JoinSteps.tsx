export default function JoinSteps({ on }: { on: 1 | 2 | 3 | 4 }) {
  const steps = ['Your account', 'Choose your plan', 'Your details', 'Send for approval'];
  return (
    <ol className="join-steps" aria-label="Sign-up steps">
      {steps.map((s, i) => <li key={s} className={i + 1 === on ? 'on' : ''}>{i + 1}. {s}</li>)}
    </ol>
  );
}
