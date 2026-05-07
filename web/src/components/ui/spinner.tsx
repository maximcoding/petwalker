import { useTranslation } from 'react-i18next';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  /** Optional text shown next to the spinner. */
  label?: string;
  className?: string;
}

const SIZE_PX: Record<NonNullable<Props['size']>, number> = {
  sm: 14,
  md: 20,
  lg: 28,
};

/**
 * SVG spinner — same visual everywhere (inline buttons, page loading,
 * skeletons). Color inherits from `currentColor` so it adapts to the
 * surrounding text.
 */
export function Spinner({ size = 'md', label, className = '' }: Props): JSX.Element {
  const px = SIZE_PX[size];
  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 ${className}`}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        className="animate-spin"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
        <path
          d="M22 12a10 10 0 0 1-10 10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {label ? <span className="text-sm">{label}</span> : null}
    </span>
  );
}

/** Full-section spinner with translated "Loading…" label. */
export function PageLoading(): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
      <Spinner size="lg" label={t('common.loading')} />
    </div>
  );
}
