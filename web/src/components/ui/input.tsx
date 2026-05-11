'use client';

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

/**
 * Input — token-aware text input with optional label, helper, error,
 * prefix/suffix slots. Replaces the older `field.tsx` for new screens
 * (kept around until callers migrate).
 *
 *   <Input label="Email" type="email" required />
 *   <Input label="Phone" prefix={<Phone className="h-4 w-4" />} />
 *
 * Error state replaces helper text (per the brief: "errors replace
 * helper text").
 */
export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  label?: string;
  helper?: string;
  error?: string | null;
  /** Icon or short text rendered inside the field, leading edge. */
  prefix?: ReactNode;
  /** Icon or short text rendered inside the field, trailing edge. */
  suffix?: ReactNode;
  /** Visual size of the field. */
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASS = {
  sm: 'h-10 text-sm',
  md: 'h-12 text-base',
  lg: 'h-14 text-base',
} as const;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    helper,
    error,
    prefix,
    suffix,
    size = 'md',
    id: idProp,
    className = '',
    required,
    ...rest
  },
  ref,
): JSX.Element {
  const reactId = useId();
  const id = idProp ?? reactId;
  const describedById = error
    ? `${id}-error`
    : helper
      ? `${id}-helper`
      : undefined;

  return (
    <div className="block">
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 flex items-center gap-1 text-sm font-medium text-ink-primary"
        >
          {label}
          {required && (
            <span
              aria-hidden
              className="inline-block h-1 w-1 rounded-full bg-coral-500"
              title="Required"
            />
          )}
        </label>
      )}
      <div
        className={
          'flex w-full items-center gap-2 rounded-lg border bg-surface-raised px-3 transition-colors ' +
          (error
            ? 'border-status-danger focus-within:border-coral-600'
            : 'border-border-default focus-within:border-brand-400 focus-within:shadow-focus') +
          ' ' +
          SIZE_CLASS[size]
        }
      >
        {prefix && (
          <span className="flex shrink-0 items-center text-ink-tertiary">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedById}
          className={`min-w-0 flex-1 bg-transparent text-ink-primary outline-none placeholder:text-ink-tertiary ${className}`}
          {...rest}
        />
        {suffix && (
          <span className="flex shrink-0 items-center text-ink-tertiary">
            {suffix}
          </span>
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-coral-700">
          {error}
        </p>
      ) : helper ? (
        <p id={`${id}-helper`} className="mt-1.5 text-xs text-ink-tertiary">
          {helper}
        </p>
      ) : null}
    </div>
  );
});
