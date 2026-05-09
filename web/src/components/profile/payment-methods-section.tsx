'use client';

import type { DevAttachPaymentMethodDto } from '@petwalker/shared/dto';
import type { SavedPaymentMethod } from '@petwalker/shared/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Field } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { prettifyError } from '@/lib/prettify-error';

/**
 * Saved-cards card.
 *
 * - Lists cards via `GET /payments/payment-methods`.
 * - "Add card" branches on the SetupIntent's `dev` flag:
 *     • dev=true → render the inline fake-card form and POST to the
 *       dev attach endpoint. Lets the demo work without Stripe.js +
 *       publishable keys.
 *     • dev=false → would mount Stripe Elements with the client secret
 *       (Phase 3 scope shipped dev mode end-to-end; the real-Stripe
 *       branch is reserved here so the contract holds when keys are
 *       added later — landing the Elements integration is a follow-up).
 *
 * Removing a card detaches the PaymentMethod from the Customer. The dev
 * impl auto-promotes another saved card to default if the removed one
 * was the default; real Stripe leaves invoice_settings unchanged after
 * detach (handled by listPaymentMethods).
 */
export function PaymentMethodsSection(): JSX.Element {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);

  const cards = useQuery<SavedPaymentMethod[]>({
    queryKey: ['payment-methods'],
    queryFn: () => api.payments.listPaymentMethods(),
    staleTime: 30_000,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.payments.removePaymentMethod(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success(t('paymentMethods.removed'));
    },
    onError: (e: Error) => toast.error(prettifyError(t, e)),
  });

  async function handleRemove(id: string): Promise<void> {
    const ok = await confirm({
      title: t('paymentMethods.confirmRemoveTitle'),
      body: t('paymentMethods.confirmRemoveBody'),
      confirmLabel: t('common.remove'),
    });
    if (!ok) return;
    remove.mutate(id);
  }

  if (cards.isLoading) return <Spinner size="md" />;
  if (cards.error) {
    return (
      <p className="text-sm text-red-600">{prettifyError(t, cards.error as Error)}</p>
    );
  }

  const items = cards.data ?? [];

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">{t('paymentMethods.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((pm) => (
            <li
              key={pm.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800"
            >
              <div className="flex items-center gap-3">
                <span
                  className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  aria-label={t('paymentMethods.brandLabel', { brand: pm.brand })}
                >
                  {pm.brand}
                </span>
                <span className="text-sm">
                  •••• {pm.last4} —{' '}
                  <span className="text-slate-500">
                    {String(pm.expMonth).padStart(2, '0')}/{String(pm.expYear).slice(-2)}
                  </span>
                </span>
                {pm.isDefault ? (
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                    {t('paymentMethods.default')}
                  </span>
                ) : null}
                {pm.dev ? (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    {t('paymentMethods.devTag')}
                  </span>
                ) : null}
              </div>
              <Button
                variant="secondary"
                onClick={() => handleRemove(pm.id)}
                disabled={remove.isPending}
              >
                {t('common.remove')}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <AddCardForm onClose={() => setAdding(false)} />
      ) : (
        <Button onClick={() => setAdding(true)}>{t('paymentMethods.addCard')}</Button>
      )}
    </div>
  );
}

/**
 * Add-card subform.
 *
 * Calls `createSetupIntent` first. If the response says `dev:true`, render
 * a synthetic card form and POST to the dev attach endpoint. Otherwise
 * (real-Stripe path) we'd mount Stripe Elements here — that branch is a
 * Phase 3 follow-up; for now we surface a friendly message instead.
 */
function AddCardForm({ onClose }: { onClose: () => void }): JSX.Element {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const setupIntent = useQuery({
    queryKey: ['setup-intent'],
    queryFn: () => api.payments.createSetupIntent(),
    // Mint a fresh intent every time the form opens.
    staleTime: 0,
    gcTime: 0,
  });

  const [brand, setBrand] = useState<DevAttachPaymentMethodDto['brand']>('visa');
  const [last4, setLast4] = useState('4242');
  const [expMonth, setExpMonth] = useState('12');
  const [expYear, setExpYear] = useState(String(new Date().getFullYear() + 2));
  const [makeDefault, setMakeDefault] = useState(false);

  const attach = useMutation({
    mutationFn: (body: DevAttachPaymentMethodDto) => api.payments.devAttachPaymentMethod(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success(t('paymentMethods.added'));
      onClose();
    },
    onError: (e: Error) => toast.error(prettifyError(t, e)),
  });

  if (setupIntent.isLoading) return <Spinner size="sm" />;
  if (setupIntent.error) {
    return (
      <p className="text-sm text-red-600">
        {prettifyError(t, setupIntent.error as Error)}
      </p>
    );
  }

  if (setupIntent.data && !setupIntent.data.dev) {
    // Real-Stripe path. Stripe Elements integration is the follow-up
    // slice; surface a friendly message rather than silently failing.
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
        {t('paymentMethods.realStripeNotYetWired')}
        <div className="mt-2">
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    attach.mutate({
      brand,
      last4,
      expMonth: Number(expMonth),
      expYear: Number(expYear),
      makeDefault,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
        {t('paymentMethods.devFormTitle')}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium">
            {t('paymentMethods.brandLabel', { brand: '' }).trim()}
          </span>
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value as typeof brand)}
            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="visa">Visa</option>
            <option value="mastercard">Mastercard</option>
            <option value="amex">Amex</option>
          </select>
        </label>
        <Field
          label={t('paymentMethods.last4')}
          value={last4}
          onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
        />
        <Field
          label={t('paymentMethods.expMonth')}
          type="number"
          min={1}
          max={12}
          value={expMonth}
          onChange={(e) => setExpMonth(e.target.value)}
        />
        <Field
          label={t('paymentMethods.expYear')}
          type="number"
          min={2024}
          max={2099}
          value={expYear}
          onChange={(e) => setExpYear(e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={makeDefault}
          onChange={(e) => setMakeDefault(e.target.checked)}
        />
        {t('paymentMethods.makeDefault')}
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={attach.isPending}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={attach.isPending}>
          {attach.isPending ? t('common.saving') : t('paymentMethods.addCard')}
        </Button>
      </div>
    </form>
  );
}
