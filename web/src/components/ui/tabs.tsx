'use client';

import type { JSX, ReactNode } from 'react';

/**
 * Tabs — segmented control used for the auth-mode switch.
 *
 * Controlled component. `value` selects the active tab; `onChange`
 * fires when the user clicks another tab. Each tab is a touch-min
 * 44px target, keyboard reachable, and rendered as a real <button>
 * for accessibility.
 *
 *   <Tabs
 *     value={mode}
 *     onChange={setMode}
 *     items={[
 *       { value: 'email', label: 'Email', icon: <Mail … /> },
 *       { value: 'magic', label: 'Magic link', icon: <Link … /> },
 *       { value: 'phone', label: 'Phone', icon: <Phone … /> },
 *     ]}
 *   />
 */
export interface TabItem<T extends string = string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export interface TabsProps<T extends string = string> {
  value: T;
  onChange: (next: T) => void;
  items: TabItem<T>[];
  /** Visible name for screen readers. */
  ariaLabel?: string;
  className?: string;
}

export function Tabs<T extends string = string>({
  value,
  onChange,
  items,
  ariaLabel,
  className = '',
}: TabsProps<T>): JSX.Element {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex w-full items-stretch gap-1 rounded-pill bg-warm-100 p-1 ${className}`}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.value)}
            className={
              'inline-flex flex-1 items-center justify-center gap-1.5 rounded-pill px-3 py-2 text-sm font-medium transition-colors ' +
              (active
                ? 'bg-surface-raised text-brand-700 shadow-subtle'
                : 'text-ink-secondary hover:text-ink-primary')
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
