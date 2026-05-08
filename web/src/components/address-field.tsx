'use client';

import { useTranslation } from 'react-i18next';

import type { Address } from '@petwalker/shared/types';

/**
 * Loose input shape — accepts both strict `Address` and the zod-inferred
 * DTO type where `lat`/`lng` are `number | null | undefined`. Output via
 * `onChange` is always the strict `Address`, which is what backend DTOs
 * accept too (zod normalizes undefined → null on parse).
 */
type AddressLike = {
  text: string;
  lat?: number | null;
  lng?: number | null;
};

interface Props {
  value: AddressLike | null | undefined;
  onChange: (next: Address | null) => void;
  /** Optional id/label override for the textarea. */
  label?: string;
  hint?: string;
}

/**
 * Minimal address editor: a single textarea for free-form text. Lat/lng
 * stay null in v1 — we'll add a "pin location" affordance later if owners
 * actually need it. Empty string clears (passes `null` upstream).
 *
 * The component is "controlled-ish": local edits flow up via onChange after
 * each keystroke as a full Address. Nullable so callers can model "no
 * address set" without needing a separate boolean.
 */
export function AddressField({ value, onChange, label, hint }: Props): JSX.Element {
  const { t } = useTranslation();

  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">
        {label ?? t('address.label')}
      </span>
      <textarea
        rows={2}
        value={value?.text ?? ''}
        onChange={(e) => {
          const text = e.target.value;
          if (!text.trim()) {
            onChange(null);
          } else {
            onChange({ text, lat: value?.lat ?? null, lng: value?.lng ?? null });
          }
        }}
        placeholder={t('address.placeholder')}
        className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
      />
      {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}
