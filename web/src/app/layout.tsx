import './globals.css';

import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Plus_Jakarta_Sans } from 'next/font/google';
import type { PropsWithChildren } from 'react';

import { Providers } from './providers';

/**
 * Type system (per the design-system theme):
 *   • Headlines / display  → Plus Jakarta Sans  (`--font-display`)
 *   • Body + labels        → Be Vietnam Pro     (`--font-body`)
 *
 * globals.css points `--font-sans` at the body font and applies
 * the display font to every heading element.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const beVietnam = Be_Vietnam_Pro({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
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
  maximumScale: 5,
  viewportFit: 'cover',
  colorScheme: 'light',
};

export default function RootLayout({ children }: PropsWithChildren): JSX.Element {
  return (
    <html lang="en" className={`${jakarta.variable} ${beVietnam.variable}`}>
      <body className="bg-surface-base font-sans text-ink-primary">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
