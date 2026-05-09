'use client';

import { SUPPORTED_CURRENCIES } from '@petwalker/shared/types';
import type { SupportedCurrency, User } from '@petwalker/shared/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftRight,
  ChevronDown,
  Coins,
  Languages,
  LogOut,
  Ruler,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useConfirm } from '@/components/ui/confirm-dialog';
import { useViewMode } from '@/contexts/view-mode-context';
import { useUnits, type UnitsPreference } from '@/hooks/use-units';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n';
import { api } from '@/lib/api';
import { signOut } from '@/lib/auth';
import { prettifyError } from '@/lib/prettify-error';

interface Props {
  me: User;
}

function initials(me: User): string {
  const src = (me.fullName ?? me.email ?? '?').trim();
  const parts = src.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const second = parts[1]?.[0] ?? '';
  if (first && second) return (first + second).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

/**
 * Avatar dropdown — the user's status menu.
 *
 * Layout (top → bottom): identity header, primary nav (Profile,
 * Switch mode), display preferences (Language, Currency, Units),
 * Sign out. Native selects are wrapped in a pill with a chevron icon
 * to look consistent across browsers; clicks inside the menu don't
 * collapse it so users can flip multiple preferences in one open.
 */
export function UserMenu({ me }: Props): JSX.Element {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const { mode, canToggle, toggle } = useViewMode();
  const [units, setUnits] = useUnits();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function handleSignOut(): Promise<void> {
    setOpen(false);
    const ok = await confirm({
      title: t('confirms.signOut'),
      body: t('confirms.signOutBody'),
      confirmLabel: t('nav.signOut'),
    });
    if (!ok) return;
    await signOut();
    router.replace('/');
  }

  function handleToggleMode(): void {
    setOpen(false);
    toggle();
  }

  // Currency change persists to the backend; toast on success/error
  // gives the user feedback even though the menu stays open.
  const currencyMutation = useMutation({
    mutationFn: (next: SupportedCurrency) =>
      api.users.updateMe({ preferredCurrency: next }),
    onSuccess: (updated) => {
      qc.setQueryData(['me'], updated);
      void qc.invalidateQueries({ queryKey: ['me'] });
      toast.success(t('common.saved'));
    },
    onError: (e: Error) => toast.error(prettifyError(t, e)),
  });

  const currentLang = (i18n.resolvedLanguage ?? i18n.language ?? 'en') as SupportedLanguage;
  const currentCurrency: SupportedCurrency = me.preferredCurrency ?? 'USD';
  const otherMode: 'owner' | 'provider' = mode === 'owner' ? 'provider' : 'owner';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white ring-offset-2 transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 dark:ring-offset-slate-900"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('userMenu.openLabel')}
      >
        {me.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={me.avatarUrl}
            alt=""
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <span aria-hidden>{initials(me)}</span>
        )}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-900 dark:ring-white/5"
        >
          {/* Identity header */}
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
              {me.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={me.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <span aria-hidden>{initials(me)}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                {me.fullName ?? me.email}
              </p>
              {me.fullName ? (
                <p className="truncate text-xs text-slate-500">{me.email}</p>
              ) : null}
            </div>
          </div>

          {/* Primary nav */}
          <nav className="py-1">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              role="menuitem"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Settings className="h-4 w-4 text-slate-400" aria-hidden />
              <span className="flex-1">{t('userMenu.profile')}</span>
            </Link>

            {canToggle ? (
              <button
                type="button"
                onClick={handleToggleMode}
                role="menuitem"
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ArrowLeftRight className="h-4 w-4 text-slate-400" aria-hidden />
                <span className="flex-1">{t(`userMenu.switchTo.${otherMode}`)}</span>
                <ModePill mode={mode} label={t(`userMenu.currentMode.${mode}`)} />
              </button>
            ) : null}
          </nav>

          {/* Display preferences */}
          <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {t('userMenu.preferences')}
            </p>
            <div className="space-y-1">
              <PrefRow icon={Languages} label={t('common.language')}>
                <PillSelect
                  value={currentLang}
                  onChange={(value) => void i18n.changeLanguage(value)}
                  ariaLabel={t('common.language')}
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {t(`lang.${lang}`)}
                    </option>
                  ))}
                </PillSelect>
              </PrefRow>
              <PrefRow icon={Coins} label={t('currency.label')}>
                <PillSelect
                  value={currentCurrency}
                  onChange={(value) => {
                    const next = value as SupportedCurrency;
                    if (next !== currentCurrency) currencyMutation.mutate(next);
                  }}
                  disabled={currencyMutation.isPending}
                  ariaLabel={t('currency.label')}
                >
                  {SUPPORTED_CURRENCIES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </PillSelect>
              </PrefRow>
              <PrefRow icon={Ruler} label={t('userMenu.units')}>
                <PillSelect
                  value={units}
                  onChange={(value) => setUnits(value as UnitsPreference)}
                  ariaLabel={t('userMenu.units')}
                >
                  <option value="metric">{t('userMenu.unitsMetric')}</option>
                  <option value="imperial">{t('userMenu.unitsImperial')}</option>
                </PillSelect>
              </PrefRow>
            </div>
          </div>

          {/* Sign out */}
          <div className="border-t border-slate-100 py-1 dark:border-slate-800">
            <button
              type="button"
              onClick={handleSignOut}
              role="menuitem"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              <span>{t('nav.signOut')}</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface PrefRowProps {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}

function PrefRow({ icon: Icon, label, children }: PrefRowProps): JSX.Element {
  return (
    <div className="flex items-center gap-3 py-1">
      <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      <span className="flex-1 text-sm text-slate-600 dark:text-slate-300">{label}</span>
      {children}
    </div>
  );
}

interface PillSelectProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  disabled?: boolean;
  children: ReactNode;
}

/**
 * Native <select> wrapped in a pill with a chevron overlay so the
 * trigger looks consistent across browsers (default OS appearance is
 * inconsistent — Safari/Chrome/Firefox each render selects differently).
 */
function PillSelect({
  value,
  onChange,
  ariaLabel,
  disabled,
  children,
}: PillSelectProps): JSX.Element {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={ariaLabel}
        className="appearance-none rounded-md border border-slate-200 bg-white py-1.5 pl-3 pr-7 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:focus:ring-brand-900/40"
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
        aria-hidden
      />
    </div>
  );
}

interface ModePillProps {
  mode: 'owner' | 'provider';
  label: string;
}

function ModePill({ mode, label }: ModePillProps): JSX.Element {
  const tone =
    mode === 'provider'
      ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200'
      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200';
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tone}`}
    >
      {label}
    </span>
  );
}
