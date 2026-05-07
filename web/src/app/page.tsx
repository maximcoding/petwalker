import Link from 'next/link';

export default function LandingPage(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-5xl font-semibold tracking-tight">petwalker</h1>
      <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
        Two-sided dog walker marketplace.
      </p>
      <div className="mt-10 flex gap-3">
        <Link
          href="/sign-in"
          className="rounded-lg bg-brand-600 px-5 py-3 font-medium text-white hover:bg-brand-700"
        >
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="rounded-lg border border-slate-300 px-5 py-3 font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
        >
          Create account
        </Link>
      </div>
    </main>
  );
}
