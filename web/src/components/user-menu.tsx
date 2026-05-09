'use client';

import type { User } from '@petwalker/shared/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useConfirm } from '@/components/ui/confirm-dialog';
import { useViewMode } from '@/contexts/view-mode-context';
import { signOut } from '@/lib/auth';


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
 * Avatar dropdown that consolidates the personal-identity surface.
 * Replaces the legacy "Me" + "Profile" + "Sign out" links in the navbar.
 *
 * Contains:
 *  - Header: name + email
 *  - Profile (always)
 *  - Mode switch (only when role === 'both')
 *  - Sign out
 *
 * Notifications and language stay outside this menu — they're navbar-level
 * affordances. Favorites/Messages live in the role-aware nav, not here.
 */
export function UserMenu({ me }: Props): JSX.Element {
  const router = useRouter();
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { mode, canToggle, toggle } = useViewMode();
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

  const otherMode: 'owner' | 'provider' = mode === 'owner' ? 'provider' : 'owner';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white ring-offset-2 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 dark:ring-offset-slate-900"
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
          className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="border-b border-slate-100 px-4 py-3 text-sm dark:border-slate-800">
            <p className="truncate font-medium">{me.fullName ?? me.email}</p>
            {me.fullName ? (
              <p className="truncate text-xs text-slate-500">{me.email}</p>
            ) : null}
          </div>

          <nav className="py-1 text-sm">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              role="menuitem"
              className="block px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {t('userMenu.profile')}
            </Link>

            {canToggle ? (
              <button
                type="button"
                onClick={handleToggleMode}
                role="menuitem"
                className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <span>{t(`userMenu.switchTo.${otherMode}`)}</span>
                <span className="text-xs text-slate-500">
                  {t(`userMenu.currentMode.${mode}`)}
                </span>
              </button>
            ) : null}
          </nav>

          <div className="border-t border-slate-100 py-1 dark:border-slate-800">
            <button
              type="button"
              onClick={handleSignOut}
              role="menuitem"
              className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {t('nav.signOut')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
