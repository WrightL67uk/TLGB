type Step = 'plan' | 'account' | 'payment' | 'details' | 'send';

/** Sign-up progress: choose a plan, account, payment (paid plans only), details, send for approval. */
export default function JoinSteps({ on, free = false }: { on: Step; free?: boolean }) {
  const steps: [Step, string][] = [
    ['plan', 'Choose your plan'],
    ['account', 'Your account'],
    ...(free ? [] : [['payment', 'Payment'] as [Step, string]]),
    ['details', 'Your details'],
    ['send', 'Send for approval'],
  ];
  return (
    <ol className="join-steps" aria-label="Sign-up steps">
      {steps.map(([k, s], i) => <li key={k} className={k === on ? 'on' : ''}>{i + 1}. {s}</li>)}
    </ol>
  );
}
