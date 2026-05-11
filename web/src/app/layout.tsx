import './globals.css';

import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import type { PropsWithChildren } from 'react';

import { Providers } from './providers';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'petwalker',
  description: 'Two-sided pet care marketplace — walking, sitting, grooming, vet, and more.',
  applicationName: 'petwalker',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon-192.svg', sizes: '192x192' }],
  },
  appleWebApp: {
    capable: true,
    title: 'petwalker',
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#5b6dff',
  width: 'device-width',
  initialScale: 1,
  // Respect user pinch-zoom for accessibility — never lock to 1.0.
  maximumScale: 5,
  viewportFit: 'cover',
  // Light mode only — explicitly opt out of dark colour scheme.
  colorScheme: 'light',
};

export default function RootLayout({ children }: PropsWithChildren): JSX.Element {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="bg-surface-base font-sans text-ink-primary">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
