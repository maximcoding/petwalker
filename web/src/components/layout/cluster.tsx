import type { HTMLAttributes, JSX, PropsWithChildren } from 'react';

/**
 * Cluster — horizontal flex container that wraps. Use for chip rows,
 * inline metadata, action button groups.
 */
export interface ClusterProps
  extends PropsWithChildren<HTMLAttributes<HTMLDivElement>> {
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  wrap?: boolean;
}

const GAP_CLASS = {
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-3',
  lg: 'gap-4',
  xl: 'gap-6',
} as const;

const ALIGN_CLASS = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  baseline: 'items-baseline',
} as const;

const JUSTIFY_CLASS = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
} as const;

export function Cluster({
  gap = 'sm',
  align = 'center',
  justify = 'start',
  wrap = true,
  className = '',
  children,
  ...rest
}: ClusterProps): JSX.Element {
  return (
    <div
      className={`flex ${wrap ? 'flex-wrap' : ''} ${GAP_CLASS[gap]} ${ALIGN_CLASS[align]} ${JUSTIFY_CLASS[justify]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
