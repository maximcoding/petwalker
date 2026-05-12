'use client';

import { useEffect, useRef, type JSX, type PropsWithChildren } from 'react';

/**
 * Drawer — accessible mobile slide-out panel.
 *
 * - Mounted in a portal-style fixed overlay; click on backdrop or Escape closes.
 * - Slides from the leading edge (LTR: left, RTL: right) by default.
 * - Focus is moved into the panel on open and returned on close.
 * - Body scroll is locked while open.
 */
export interface DrawerProps extends PropsWithChildren {
  open: boolean;
  onClose: () => void;
  /** Logical side: `start` (leading) or `end` (trailing). RTL-aware via `inset-inline-*`. */
  side?: 'start' | 'end';
  /** Visible label for screen readers. */
  ariaLabel: string;
}

export function Drawer({
  open,
  onClose,
  side = 'start',
  ariaLabel,
  children,
}: DrawerProps): JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      lastFocusedRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const sideClass =
    side === 'start'
      ? 'start-0 ltr:translate-x-0 rtl:translate-x-0 border-e'
      : 'end-0 border-s';

  return (
    <div
      className="fixed inset-0 z-drawer flex"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close drawer"
        className="absolute inset-0 bg-warm-900/40 transition-opacity"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative h-full w-72 max-w-[80vw] overflow-y-auto bg-surface-raised shadow-overlay border-border-subtle ${sideClass}`}
      >
        {children}
      </div>
    </div>
  );
}
