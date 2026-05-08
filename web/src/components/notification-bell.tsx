'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotifications } from '@/hooks/use-notifications';

import type { WebNotification } from '@petwalker/shared';

export function NotificationBell(): JSX.Element {
  const { t } = useTranslation();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
        aria-label={t('notifications.bell')}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-8 z-50 w-80 rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <span className="text-sm font-semibold">{t('notifications.title')}</span>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              >
                {t('notifications.markAllRead')}
              </button>
            ) : null}
          </div>

          <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
            {notifications.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-slate-400">
                {t('notifications.empty')}
              </li>
            ) : (
              notifications.map((n) => (
                <NotificationItem key={n.id} notification={n} onRead={markRead} />
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function NotificationItem({
  notification: n,
  onRead,
}: {
  notification: WebNotification;
  onRead: (id: string) => void;
}): JSX.Element {
  return (
    <li
      className={`flex cursor-pointer gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
        n.readAt === null ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
      }`}
      onClick={() => {
        if (n.readAt === null) onRead(n.id);
        if (n.deepLink) window.location.href = n.deepLink.replace('petwalker://', '/');
      }}
    >
      {n.readAt === null ? (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
      ) : (
        <span className="mt-1.5 h-2 w-2 shrink-0" />
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{n.title}</p>
        <p className="truncate text-xs text-slate-500">{n.body}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">
          {new Date(n.createdAt).toLocaleString()}
        </p>
      </div>
    </li>
  );
}
