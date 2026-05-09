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
 * session UI yet. Phase 2 reserves the screen and explains the current
 * state — the Phase-3+ Stripe SetupIntent + saved-cards flow will need a
 * real verify-by-password gate, and that's when this section gets actual
 * controls.
 *
 * For now we surface the immutable email (read-only) and the linked
 * Cognito sub so power users can correlate to their auth provider.
 */
export function SecuritySection({ me }: Props): JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <Row label={t('security.email')} value={me.email} hint={t('security.emailHint')} />
      <Row
        label={t('security.linkedAccount')}
        value={me.cognitoSub}
        hint={t('security.linkedAccountHint')}
        mono
      />
      <Placeholder label={t('security.password')} hint={t('security.passwordHint')} />
      <Placeholder label={t('security.twoFactor')} hint={t('security.twoFactorHint')} />
      <Placeholder label={t('security.sessions')} hint={t('security.sessionsHint')} />
    </div>
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
    <div>
      <p className="text-sm font-medium">{label}</p>
      <p
        className={`mt-0.5 ${mono ? 'font-mono text-xs' : 'text-sm'} break-all text-slate-600 dark:text-slate-300`}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

interface PlaceholderProps {
  label: string;
  hint: string;
}

function Placeholder({ label, hint }: PlaceholderProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-700">
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        {t('security.comingSoon')}
      </p>
    </div>
  );
}
