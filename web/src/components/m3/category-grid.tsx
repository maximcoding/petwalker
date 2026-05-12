'use client';

import {
  Camera,
  Dumbbell,
  Footprints,
  HeartHandshake,
  Home,
  PartyPopper,
  PawPrint,
  Scissors,
  Sparkles,
  Stethoscope,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import type { JSX } from 'react';

import {
  ALL_CATEGORIES,
  CATEGORY_HUE,
  CATEGORY_LABELS,
  type ServiceCategory,
} from '@/lib/mock/types';

/**
 * CategoryGrid — 11 service-category tiles with per-category hue.
 *
 * Each tile is a Link that navigates into /search?service=<cat>.
 * Layout: 3 cols on phones, up to 6 cols on desktop. Each tile is
 * a coloured square-ish surface so the colorful-pets palette
 * announces itself loudly above the fold.
 */
const ICON_BY_CATEGORY: Record<ServiceCategory, LucideIcon> = {
  walking: Footprints,
  sitting: HeartHandshake,
  grooming: Scissors,
  boarding: Home,
  training: PawPrint,
  daycare: PartyPopper,
  fitness: Dumbbell,
  vetVisit: Stethoscope,
  photography: Camera,
  massage: Sparkles,
  seniorCare: Sun,
};

const HUE_TILE: Record<string, string> = {
  brand: 'bg-brand-100 text-brand-700 hover:bg-brand-200',
  coral: 'bg-coral-100 text-coral-700 hover:bg-coral-200',
  sunshine: 'bg-sunshine-100 text-sunshine-700 hover:bg-sunshine-200',
  mint: 'bg-mint-100 text-mint-700 hover:bg-mint-200',
  sky: 'bg-sky-100 text-sky-700 hover:bg-sky-200',
  lavender: 'bg-lavender-100 text-lavender-700 hover:bg-lavender-200',
  peach: 'bg-peach-100 text-peach-700 hover:bg-peach-200',
  warm: 'bg-warm-100 text-warm-700 hover:bg-warm-200',
};

export function CategoryGrid(): JSX.Element {
  return (
    <section className="py-6">
      <h2 className="mb-4 text-lg font-bold tracking-tight text-ink-primary sm:text-xl">
        Browse by category
      </h2>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {ALL_CATEGORIES.map((c) => {
          const Icon = ICON_BY_CATEGORY[c];
          const palette = HUE_TILE[CATEGORY_HUE[c]] ?? HUE_TILE.warm;
          return (
            <li key={c}>
              <Link
                href={`/search?service=${c}`}
                className={`flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl p-3 text-center transition-colors ${palette}`}
              >
                <Icon className="h-8 w-8" aria-hidden />
                <span className="text-xs font-semibold leading-tight sm:text-sm">
                  {CATEGORY_LABELS[c]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
