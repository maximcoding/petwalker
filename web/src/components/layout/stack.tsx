import type { ElementType, HTMLAttributes, JSX, PropsWithChildren } from 'react';

/**
 * Stack — vertical flex container with a token-aware gap.
 * Use for stacked sections, form fields, list items.
 */
export interface StackProps
  extends PropsWithChildren<HTMLAttributes<HTMLElement>> {
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  as?: 'div' | 'section' | 'article' | 'ul' | 'ol';
}

const GAP_CLASS = {
  xs: 'gap-1',     // 4px
  sm: 'gap-2',     // 8px
  md: 'gap-4',     // 16px
  lg: 'gap-6',     // 24px
  xl: 'gap-8',     // 32px
  '2xl': 'gap-12', // 48px
} as const;

const ALIGN_CLASS = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
} as const;

export function Stack({
  gap = 'md',
  align = 'stretch',
  as = 'div',
  className = '',
  children,
  ...rest
}: StackProps): JSX.Element {
  // Polymorphic element — cast through `ElementType` so spread props
  // line up with whichever tag the consumer picked.
  const Tag = as as ElementType;
  return (
    <Tag
      className={`flex flex-col ${GAP_CLASS[gap]} ${ALIGN_CLASS[align]} ${className}`}
      {...(rest as Record<string, unknown>)}
    >
      {children}
    </Tag>
  );
}
