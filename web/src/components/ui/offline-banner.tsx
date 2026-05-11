'use client';

import { WifiOff } from 'lucide-react';
import { useEffect, useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * OfflineBanner — slim sticky banner shown when `navigator.onLine`
 * is false. Per the brief: "You're offline — some actions are paused."
 *
 * Mounted once near the top of the App Shell. Hidden when online.
 */
export function OfflineBanner(): JSX.Element | null {
  const { t } = useTranslation();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = (): void => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-toast flex items-center justify-center gap-2 bg-coral-100 px-4 py-2 text-xs font-medium text-coral-700"
    >
      <WifiOff className="h-4 w-4" aria-hidden />
      <span>
        {t('common.offline', {
          defaultValue: "You're offline — some actions are paused.",
        })}
      </span>
    </div>
  );
}
