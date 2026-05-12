'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type JSX,
  type KeyboardEvent,
} from 'react';

/**
 * OtpInput — N-cell numeric one-time-password field.
 *
 *   <OtpInput length={6} value={code} onChange={setCode} onComplete={submit} />
 *
 * Behaviours:
 *   - Auto-advance to the next cell on a digit press.
 *   - Backspace on an empty cell jumps to the previous one.
 *   - Pasting a number string of any length fills cells left-to-right.
 *   - `inputMode="numeric"` + `autoComplete="one-time-code"` so the
 *     SMS auto-fill works on iOS/Android.
 *   - `onComplete` fires once all cells are filled (last-cell change
 *     triggers it) so callers can auto-submit.
 *   - `error` switches cell borders to the coral status colour.
 */
export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (next: string) => void;
  onComplete?: (code: string) => void;
  error?: string | null;
  /** Visible label for screen readers. */
  ariaLabel?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  error,
  ariaLabel,
  autoFocus = false,
  disabled = false,
}: OtpInputProps): JSX.Element {
  const groupId = useId();
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  const cells = useMemo(() => {
    const arr = value.split('');
    while (arr.length < length) arr.push('');
    return arr.slice(0, length);
  }, [value, length]);

  useEffect(() => {
    if (autoFocus) {
      inputsRef.current[0]?.focus();
    }
  }, [autoFocus]);

  const commit = useCallback(
    (next: string) => {
      const clean = next.replace(/\D/g, '').slice(0, length);
      onChange(clean);
      if (clean.length === length) {
        onComplete?.(clean);
      }
    },
    [length, onChange, onComplete],
  );

  const handleChange = (i: number, raw: string): void => {
    // The native input lets users type multiple characters into one cell
    // (e.g. via IME); normalise to one digit and forward overflow to
    // the next cells when applicable (paste handling owns multi-digit).
    const digits = raw.replace(/\D/g, '');
    if (!digits) return;
    const arr = cells.slice();
    arr[i] = digits[0]!;
    // If user pasted multiple, spread across following cells
    for (let k = 1; k < digits.length && i + k < length; k++) {
      arr[i + k] = digits[k]!;
    }
    const nextValue = arr.join('').replace(/\D/g, '');
    commit(nextValue);
    const focusTarget = Math.min(i + digits.length, length - 1);
    inputsRef.current[focusTarget]?.focus();
    setActiveIdx(focusTarget);
  };

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Backspace') {
      if (cells[i]) {
        // Clear the current cell first
        const arr = cells.slice();
        arr[i] = '';
        commit(arr.join(''));
        return;
      }
      // Empty cell — jump back
      e.preventDefault();
      const prev = Math.max(0, i - 1);
      inputsRef.current[prev]?.focus();
      setActiveIdx(prev);
      const arr = cells.slice();
      arr[prev] = '';
      commit(arr.join(''));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = Math.max(0, i - 1);
      inputsRef.current[prev]?.focus();
      setActiveIdx(prev);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = Math.min(length - 1, i + 1);
      inputsRef.current[next]?.focus();
      setActiveIdx(next);
    }
  };

  const handlePaste = (i: number, e: ClipboardEvent<HTMLInputElement>): void => {
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;
    e.preventDefault();
    handleChange(i, pasted);
  };

  return (
    <div role="group" aria-label={ariaLabel} className="block">
      <div className="flex justify-center gap-2">
        {cells.map((cell, i) => (
          <input
            key={`${groupId}-${i}`}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={length}
            disabled={disabled}
            value={cell}
            aria-label={`Digit ${i + 1} of ${length}`}
            aria-invalid={error ? true : undefined}
            onFocus={() => setActiveIdx(i)}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={(e) => handlePaste(i, e)}
            className={
              'h-14 w-12 rounded-lg border bg-surface-raised text-center text-xl font-semibold text-ink-primary outline-none transition-all sm:h-16 sm:w-14 sm:text-2xl ' +
              (error
                ? 'border-status-danger bg-coral-50/40 text-coral-700'
                : activeIdx === i || cell
                  ? 'border-brand-500 text-brand-700 shadow-focus'
                  : 'border-border-default')
            }
          />
        ))}
      </div>
      {error && (
        <p className="mt-2 text-center text-xs font-medium text-coral-700">{error}</p>
      )}
    </div>
  );
}
