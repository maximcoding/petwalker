'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from './button';

interface ConfirmOptions {
  title: string;
  body?: string;
  /** Defaults to t('common.confirm') */
  confirmLabel?: string;
  /** Defaults to t('common.cancel') */
  cancelLabel?: string;
  /** Renders the confirm button in red. */
  destructive?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmCtx = createContext<ConfirmFn | null>(null);

/**
 * Promise-based confirm dialog. Wrap your tree once with `<ConfirmProvider>`
 * and call `useConfirm()` to get a function that returns `true` if the user
 * confirms, `false` if they cancel or close. No callback hell.
 *
 * Example:
 *   const confirm = useConfirm();
 *   if (await confirm({ title: 'Delete pet?', destructive: true })) deletePet();
 */
export function ConfirmProvider({ children }: { children: ReactNode }): JSX.Element {
  const { t } = useTranslation();
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((nextOpts) => {
    return new Promise<boolean>((resolve) => {
      setOpts(nextOpts);
      setResolver(() => resolve);
    });
  }, []);

  const handle = (value: boolean): void => {
    resolver?.(value);
    setOpts(null);
    setResolver(null);
  };

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {opts ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) handle(false);
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900">
            <h2 id="confirm-title" className="text-base font-semibold">
              {opts.title}
            </h2>
            {opts.body ? (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{opts.body}</p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => handle(false)}>
                {opts.cancelLabel ?? t('common.cancel')}
              </Button>
              <Button
                variant={opts.destructive ? 'danger' : 'primary'}
                onClick={() => handle(true)}
                autoFocus
              >
                {opts.confirmLabel ?? t('auth.confirm')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmCtx.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) {
    throw new Error('useConfirm must be used inside <ConfirmProvider>');
  }
  return ctx;
}
