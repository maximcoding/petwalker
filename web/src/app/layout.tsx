import './globals.css';

import type { Metadata } from 'next';
import type { PropsWithChildren } from 'react';

import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'petwalker',
  description: 'Two-sided dog walker marketplace',
};

export default function RootLayout({ children }: PropsWithChildren): JSX.Element {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
