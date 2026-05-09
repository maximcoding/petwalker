'use client';

import type { User } from '@petwalker/shared/types';
import { useTranslation } from 'react-i18next';

interface Props {
  me: User;
}

/**
 * Account & Security card.
 *
 * Auth is currently brokered by Cognito so we don't own password / 2FA /
 * session UI yet. This view is intentionally plain — definition-list of
 * label + value rows, no nested cards or dashed boxes. The Phase-3+
 * Stripe SetupIntent + saved-cards flow will need a real verify-by-
 * password gate; that's when the placeholder rows below get real
 * controls.
 */
export function SecuritySection({ me }: Props): JSX.Element {
  const { t } = useTranslation();

  return (
    <dl className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
      <Row label={t('security.email')} value={me.email} hint={t('security.emailHint')} />
      <Row
        label={t('security.linkedAccount')}
        value={me.cognitoSub}
        hint={t('security.linkedAccountHint')}
        mono
      />
      <PendingRow label={t('security.password')} hint={t('security.passwordHint')} />
      <PendingRow label={t('security.twoFactor')} hint={t('security.twoFactorHint')} />
      <PendingRow label={t('security.sessions')} hint={t('security.sessionsHint')} />
    </dl>
  );
}

interface RowProps {
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
}

function Row({ label, value, hint, mono }: RowProps): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[180px_1fr]">
      <dt className="font-medium">{label}</dt>
      <dd
        className={`break-all ${mono ? 'font-mono text-xs' : ''} text-slate-700 dark:text-slate-200`}
      >
        {value}
        {hint ? (
          <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>
        ) : null}
      </dd>
    </div>
  );
}

interface PendingRowProps {
  label: string;
  hint: string;
}

function PendingRow({ label, hint }: PendingRowProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[180px_1fr]">
      <dt className="flex items-center gap-2 font-medium">
        {label}
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {t('common.comingSoon')}
        </span>
      </dt>
      <dd className="text-xs text-slate-500">{hint}</dd>
    </div>
  );
}
