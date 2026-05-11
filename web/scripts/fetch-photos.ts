/**
 * fetch-photos.ts — populate `web/public/images/` from Unsplash.
 *
 * Reads `web/scripts/photo-manifest.json`, queries the Unsplash API
 * for one photo per entry (filtered by query + orientation), and
 * downloads the JPEG into `web/public/images/<group>/<slug>.jpg`.
 *
 * Skips entries whose target file already exists, unless run with
 * `--refresh`.
 *
 * Env: requires `UNSPLASH_ACCESS_KEY` in `.env.local` (or the shell).
 *
 * Free tier: 50 requests / hour in demo mode. After Unsplash approves
 * your application (usually within a day) you get 5000 / hour.
 *
 * No paid services. No external dependencies — uses Node 20+ built-ins
 * only (fetch, fs/promises, path, process).
 *
 * Usage:
 *   pnpm photos:fetch          # only missing files
 *   pnpm photos:refresh        # re-fetch every entry
 *   pnpm photos:fetch -- --group providers   # only one group
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { argv, cwd, env, exit } from 'node:process';

interface ManifestEntry {
  /** File-name slug — produces `<group>/<slug>.jpg`. */
  slug: string;
  /** Unsplash search query. */
  query: string;
  /** Width hint for Unsplash CDN (the URL's `w=` param). */
  w?: number;
  /** Height hint. */
  h?: number;
  /** Orientation filter passed to Unsplash. */
  orientation?: 'landscape' | 'portrait' | 'squarish';
  /** Comma-separated colour filter, e.g. "yellow_orange". */
  color?: string;
  /** Optional fixed Unsplash photo ID — bypasses search. */
  photoId?: string;
}

interface Manifest {
  groups: Record<string, ManifestEntry[]>;
}

interface UnsplashPhoto {
  id: string;
  urls: { raw: string; full: string; regular: string };
  user: { name: string; links: { html: string } };
  links: { html: string };
  alt_description?: string | null;
}

const REPO_ROOT = resolve(cwd(), '..'); // expects script run from `web/`
const MANIFEST_PATH = resolve(cwd(), 'scripts/photo-manifest.json');
const PUBLIC_IMAGES = resolve(cwd(), 'public/images');
const ATTRIBUTIONS_PATH = resolve(cwd(), 'public/images/_attributions.json');

const UNSPLASH_API = 'https://api.unsplash.com';

interface RunOptions {
  refresh: boolean;
  onlyGroup?: string;
}

function parseArgs(): RunOptions {
  const opts: RunOptions = { refresh: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--refresh') opts.refresh = true;
    else if (a === '--group' && argv[i + 1]) {
      opts.onlyGroup = argv[++i];
    }
  }
  return opts;
}

function requireKey(): string {
  const k = env.UNSPLASH_ACCESS_KEY;
  if (!k) {
    console.error(
      'UNSPLASH_ACCESS_KEY is missing.\n' +
        '  1) Get a key at https://unsplash.com/developers (free).\n' +
        `  2) Add UNSPLASH_ACCESS_KEY=... to ${join(REPO_ROOT, 'web/.env.local')}.\n` +
        '  3) Re-run pnpm photos:fetch.\n',
    );
    exit(1);
  }
  return k;
}

async function readManifest(): Promise<Manifest> {
  const raw = await readFile(MANIFEST_PATH, 'utf8');
  const data = JSON.parse(raw) as Manifest;
  if (!data.groups || typeof data.groups !== 'object') {
    throw new Error('photo-manifest.json must define a `groups` object');
  }
  return data;
}

async function findPhoto(
  key: string,
  entry: ManifestEntry,
): Promise<UnsplashPhoto> {
  if (entry.photoId) {
    const r = await fetch(`${UNSPLASH_API}/photos/${entry.photoId}`, {
      headers: { Authorization: `Client-ID ${key}` },
    });
    if (!r.ok) throw new Error(`Unsplash ${r.status} for photo ${entry.photoId}`);
    return (await r.json()) as UnsplashPhoto;
  }
  const params = new URLSearchParams({
    query: entry.query,
    per_page: '1',
    content_filter: 'high',
  });
  if (entry.orientation) params.set('orientation', entry.orientation);
  if (entry.color) params.set('color', entry.color);
  const r = await fetch(`${UNSPLASH_API}/search/photos?${params}`, {
    headers: { Authorization: `Client-ID ${key}` },
  });
  if (!r.ok) throw new Error(`Unsplash search ${r.status} for "${entry.query}"`);
  const body = (await r.json()) as { results: UnsplashPhoto[] };
  const photo = body.results[0];
  if (!photo) throw new Error(`No Unsplash result for "${entry.query}"`);
  return photo;
}

function buildDownloadUrl(photo: UnsplashPhoto, entry: ManifestEntry): string {
  const url = new URL(photo.urls.raw);
  url.searchParams.set('auto', 'format');
  url.searchParams.set('q', '80');
  url.searchParams.set('fm', 'jpg');
  if (entry.w) url.searchParams.set('w', String(entry.w));
  if (entry.h) {
    url.searchParams.set('h', String(entry.h));
    url.searchParams.set('fit', 'crop');
  }
  return url.toString();
}

async function downloadJpeg(url: string, dest: string): Promise<void> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download ${r.status} for ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, buf);
}

interface AttributionMap {
  [path: string]: { photoId: string; author: string; authorUrl: string; sourceUrl: string };
}

async function loadAttributions(): Promise<AttributionMap> {
  if (!existsSync(ATTRIBUTIONS_PATH)) return {};
  return JSON.parse(await readFile(ATTRIBUTIONS_PATH, 'utf8')) as AttributionMap;
}

async function saveAttributions(map: AttributionMap): Promise<void> {
  await mkdir(dirname(ATTRIBUTIONS_PATH), { recursive: true });
  await writeFile(ATTRIBUTIONS_PATH, JSON.stringify(map, null, 2) + '\n');
}

async function main(): Promise<void> {
  const opts = parseArgs();
  const key = requireKey();
  const manifest = await readManifest();
  const attributions = await loadAttributions();

  let fetched = 0;
  let skipped = 0;
  let total = 0;

  for (const [group, entries] of Object.entries(manifest.groups)) {
    if (opts.onlyGroup && opts.onlyGroup !== group) continue;
    for (const entry of entries) {
      total += 1;
      const dest = join(PUBLIC_IMAGES, group, `${entry.slug}.jpg`);
      const relPath = `images/${group}/${entry.slug}.jpg`;
      if (existsSync(dest) && !opts.refresh) {
        skipped += 1;
        continue;
      }
      try {
        const photo = await findPhoto(key, entry);
        const url = buildDownloadUrl(photo, entry);
        await downloadJpeg(url, dest);
        attributions[relPath] = {
          photoId: photo.id,
          author: photo.user.name,
          authorUrl: photo.user.links.html,
          sourceUrl: photo.links.html,
        };
        fetched += 1;
        console.log(`✓ ${relPath}  ←  ${photo.user.name} on Unsplash`);
        // Polite pacing — 50 req/h in demo mode = ~1 req every 72s.
        // 250ms between requests is plenty for 5000 req/h (approved tier).
        await new Promise((res) => setTimeout(res, 250));
      } catch (err) {
        console.error(`✗ ${relPath}  ${(err as Error).message}`);
      }
    }
  }

  await saveAttributions(attributions);

  console.log(
    `\nDone — ${fetched} fetched, ${skipped} cached, ${total - fetched - skipped} failed.`,
  );
  console.log(`Attribution log: ${ATTRIBUTIONS_PATH}`);
}

main().catch((err) => {
  console.error(err);
  exit(1);
});
