import { PawPrint } from 'lucide-react';
import Link from 'next/link';
import type { PropsWithChildren } from 'react';

/**
 * AuthLayout — backdrop for /sign-in, /confirm, edge-case screens.
 *
 * Visual: warm-neutral page background with two decorative gradient
 * orbs (same vibe as the guest landing). Logo pinned top-left. Card
 * content (the children) is vertically centered, max-w-md.
 *
 * Light mode only — no dark variants.
 */
export default function AuthLayout({ children }: PropsWithChildren): JSX.Element {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-surface-base">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -end-32 h-96 w-96 rounded-full bg-gradient-sunset opacity-60 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -start-40 h-[28rem] w-[28rem] rounded-full bg-gradient-meadow opacity-60 blur-3xl"
      />

      {/* Logo header */}
      <header className="relative z-elevated">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-ink-primary"
          >
            <span
              aria-hidden
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-ink-inverse"
            >
              <PawPrint className="h-4 w-4" />
            </span>
            petwalker
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-ink-secondary transition-colors hover:text-ink-primary"
          >
            ← Back home
          </Link>
        </div>
      </header>

      <div className="relative z-base flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        {children}
      </div>

      <footer className="relative z-elevated">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-center gap-4 px-4 py-4 text-xs text-ink-tertiary sm:px-6 lg:px-8">
          <Link href="/privacy" className="hover:text-ink-primary">
            Privacy
          </Link>
          <span aria-hidden>·</span>
          <Link href="/terms" className="hover:text-ink-primary">
            Terms
          </Link>
          <span aria-hidden>·</span>
          <Link href="/contact" className="hover:text-ink-primary">
            Help
          </Link>
        </div>
      </footer>
    </main>
  );
}
