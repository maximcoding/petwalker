import type { HTMLAttributes, JSX, PropsWithChildren } from 'react';

/**
 * Container — centered max-width wrapper with responsive horizontal padding.
 *
 * Sizes:
 *   sm  →  max-w-2xl  (≈ 672px) — single-column forms, focused content
 *   md  →  max-w-4xl  (≈ 896px) — list pages, profile detail
 *   lg  →  max-w-5xl  (≈ 1024px) — default; matches existing app shell
 *   xl  →  max-w-6xl  (≈ 1152px) — search/discovery with map split
 *   full →  max-w-none           — bleed (in-progress, gallery)
 */
export interface ContainerProps
  extends PropsWithChildren<HTMLAttributes<HTMLDivElement>> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const SIZE_CLASS = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-5xl',
  xl: 'max-w-6xl',
  full: 'max-w-none',
} as const;

export function Container({
  size = 'lg',
  className = '',
  children,
  ...rest
}: ContainerProps): JSX.Element {
  return (
    <div
      className={`mx-auto w-full px-4 sm:px-6 lg:px-8 ${SIZE_CLASS[size]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
