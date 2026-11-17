'use client';
import { useEffect, useState } from 'react';

/** Sends the sign-up form in the background so a warning shows at the top without wiping what was typed. */
export default function KeepForm({ formId, initialError }: { formId: string; initialError?: string }) {
  const [error, setError] = useState(initialError ?? '');
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const onSubmit = async (e: Event) => {
      e.preventDefault();
      setError('');
      const btn = form.querySelector('button[type=submit]') as HTMLButtonElement | null;
      if (btn) btn.disabled = true;
      try {
        const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { 'x-tlgb-fetch': '1' } });
        const data = await res.json();
        const target = String(data.redirect ?? '');
        const err = new URL(target, window.location.origin).searchParams.get('error');
        if (err) {
          setError(err);
          form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (target) {
          window.location.href = target;
        }
      } catch {
        form.submit();
        return;
      }
      if (btn) btn.disabled = false;
    };
    form.addEventListener('submit', onSubmit);
    return () => form.removeEventListener('submit', onSubmit);
  }, [formId]);
  return error ? <p className="err big" role="alert">{error}</p> : null;
}
