import type { PropsWithChildren } from 'react';

export default function AuthLayout({ children }: PropsWithChildren): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {children}
      </div>
    </main>
  );
}
