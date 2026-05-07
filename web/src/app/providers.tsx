'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { Toaster } from 'sonner';

import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { applyDirection, initI18n, isRtl } from '@/i18n';
import { configureAmplify } from '@/lib/amplify';
import { getQueryClient } from '@/lib/query';

const i18n = initI18n();

function DirectionSync({ children }: PropsWithChildren): JSX.Element {
  const { i18n: i18nInst } = useTranslation();
  const [lang, setLang] = useState(i18nInst.resolvedLanguage ?? i18nInst.language ?? 'en');
  useEffect(() => {
    applyDirection(lang);
    const onChange = (next: string): void => {
      applyDirection(next);
      setLang(next);
    };
    i18nInst.on('languageChanged', onChange);
    return () => i18nInst.off('languageChanged', onChange);
  }, [i18nInst, lang]);
  return (
    <>
      {children}
      <Toaster
        position="top-center"
        richColors
        closeButton
        dir={isRtl(lang) ? 'rtl' : 'ltr'}
      />
    </>
  );
}

export function Providers({ children }: PropsWithChildren): JSX.Element {
  // Hold the i18n instance in state so React reliably picks it up after the
  // module-level init.
  const [i18nReady] = useState(() => i18n);

  useEffect(() => {
    configureAmplify();
  }, []);

  return (
    <QueryClientProvider client={getQueryClient()}>
      <I18nextProvider i18n={i18nReady}>
        <DirectionSync>
          <ConfirmProvider>{children}</ConfirmProvider>
        </DirectionSync>
      </I18nextProvider>
    </QueryClientProvider>
  );
}
