import type { ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export function Button({
  variant = 'primary',
  className,
  ...rest
}: Props): JSX.Element {
  const base =
    'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-60 disabled:cursor-not-allowed';
  const styles = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700',
    secondary:
      'border border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }[variant];

  return <button className={`${base} ${styles} ${className ?? ''}`} type="button" {...rest} />;
}
