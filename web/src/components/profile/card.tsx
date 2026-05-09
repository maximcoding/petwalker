import type { PropsWithChildren } from 'react';

/**
 * Shared card chrome for profile sub-pages. Was inline in the legacy
 * single-page /profile; lifted out so each tab page can render its own
 * stack of cards without duplicating the markup.
 */
interface Props {
  title: string;
  hint?: string;
}

export function Card({ title, hint, children }: PropsWithChildren<Props>): JSX.Element {
  return (
    <section className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
      <header className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
      </header>
      {children}
    </section>
  );
}
