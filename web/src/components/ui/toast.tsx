'use client';

import { toast as sonnerToast } from 'sonner';

/**
 * Toast wrapper — typed, dogwalk-tone helpers over sonner.
 *
 * Use these instead of importing `toast` from 'sonner' directly so
 * positioning, copy, and Undo behaviour stay consistent across the
 * app. The sonner <Toaster /> root lives in `app/providers.tsx`.
 *
 * Per the brief:
 *   - success → auto-dismiss after 5s
 *   - error   → sticky with close button
 *   - undo    → reversible action confirmation with an "Undo" CTA
 */

const DEFAULT_DURATION = 5_000;

type ToastId = string | number;

interface ToastApi {
  success(message: string, opts?: { description?: string }): ToastId;
  error(message: string, opts?: { description?: string }): ToastId;
  info(message: string, opts?: { description?: string }): ToastId;
  undo(
    message: string,
    onUndo: () => void,
    opts?: { description?: string; durationMs?: number },
  ): ToastId;
  /** Pass-through for one-off custom cases. */
  raw: typeof sonnerToast;
}

export const toast: ToastApi = {
  success(message, opts) {
    return sonnerToast.success(message, {
      duration: DEFAULT_DURATION,
      description: opts?.description,
    });
  },

  error(message, opts) {
    return sonnerToast.error(message, {
      duration: Infinity, // sticky
      description: opts?.description,
      closeButton: true,
    });
  },

  info(message, opts) {
    return sonnerToast(message, {
      duration: DEFAULT_DURATION,
      description: opts?.description,
    });
  },

  undo(message, onUndo, opts) {
    return sonnerToast(message, {
      duration: opts?.durationMs ?? DEFAULT_DURATION,
      description: opts?.description,
      action: {
        label: 'Undo',
        onClick: () => onUndo(),
      },
    });
  },

  raw: sonnerToast,
};
