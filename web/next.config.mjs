import { config as loadDotenv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Load monorepo-root .env so NEXT_PUBLIC_* are available at build time.
// Without this Next looks only at web/.env(.local), but we keep one .env at root.
const here = dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: resolve(here, '../.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The shared package is consumed as a workspace dep; Next needs to transpile
  // its src on the fly when devving, since shared is ESM with .js extensions.
  transpilePackages: ['@petwalker/shared'],
  experimental: {
    typedRoutes: true,
  },
  // Image components use `unoptimized` for these but Next still parses the
  // src — allowlist the placeholder hosts so it doesn't block them.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placedog.net' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
      // MinIO bucket served by the dev backend.
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
};

export default nextConfig;
