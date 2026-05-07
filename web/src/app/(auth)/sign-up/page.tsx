'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { signUp } from '@/lib/auth';

export default function SignUpPage(): JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await signUp({ email, password, fullName, phone: phone || undefined });
      const params = new URLSearchParams({ email });
      router.push(`/confirm?${params.toString()}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-semibold">Create account</h1>
      <p className="mt-1 text-sm text-slate-500">
        We&apos;ll send a 6-digit confirmation code to your email.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Field label="Full name" value={fullName} onChange={setFullName} required />
        <Field label="Email" value={email} onChange={setEmail} type="email" required />
        <Field label="Phone (optional)" value={phone} onChange={setPhone} type="tel" />
        <Field label="Password" value={password} onChange={setPassword} type="password" required />
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <a href="/sign-in" className="font-medium text-brand-600 hover:underline">
          Sign in
        </a>
      </p>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}): JSX.Element {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"
      />
    </label>
  );
}
