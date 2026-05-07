import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface BaseProps {
  label: string;
  error?: string | null;
  hint?: string;
}

export function Field({
  label,
  error,
  hint,
  className,
  ...input
}: BaseProps & InputHTMLAttributes<HTMLInputElement>): JSX.Element {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input
        className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 ${className ?? ''}`}
        {...input}
      />
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
      {hint && !error ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function TextareaField({
  label,
  error,
  hint,
  className,
  ...input
}: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>): JSX.Element {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <textarea
        rows={4}
        className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 ${className ?? ''}`}
        {...input}
      />
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
      {hint && !error ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}
