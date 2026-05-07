'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { confirmSignUp } from '@/lib/auth';

export default function ConfirmPage(): JSX.Element {
  const params = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await confirmSignUp(email, code);
      router.push('/sign-in');
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-semibold">Confirm email</h1>
      <p className="mt-1 text-sm text-slate-500">
        Enter the 6-digit code we sent to your email.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Code</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d*"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 tracking-widest dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? 'Confirming…' : 'Confirm'}
        </button>
      </form>
    </>
  );
}
