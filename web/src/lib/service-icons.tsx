'use client';

import type { ServiceType } from '@petwalker/shared/enums';
import { ServiceType as ST, SERVICE_TYPES } from '@petwalker/shared/enums';
import {
  Activity,
  Camera,
  GraduationCap,
  HandHeart,
  Heart,
  Home,
  Scissors,
  Sofa,
  Stethoscope,
  Sun,
  Footprints,
  type LucideIcon,
} from 'lucide-react';

/**
 * Visual + semantic helpers for service types.
 *
 * `ICONS` is the authoritative icon mapping. `useServiceLabel()` gives the
 * localized label. `ALL_SERVICE_TYPES` is the rendering order — popular
 * services first so the chip strip and pickers feel familiar before drilling
 * into specialist categories.
 */
export const ICONS: Record<ServiceType, LucideIcon> = {
  [ST.Walking]: Footprints,
  [ST.Sitting]: Sofa,
  [ST.Grooming]: Scissors,
  [ST.Boarding]: Home,
  [ST.Training]: GraduationCap,
  [ST.Daycare]: Sun,
  [ST.Fitness]: Activity,
  [ST.MassageWellness]: HandHeart,
  [ST.SeniorCare]: Heart,
  [ST.Photography]: Camera,
  [ST.Veterinary]: Stethoscope,
};

// Display order — mirrors the bulk-seed weights so the most common services
// appear first in chip rows and dropdowns.
export const ALL_SERVICE_TYPES: readonly ServiceType[] = [
  ST.Walking,
  ST.Sitting,
  ST.Grooming,
  ST.Boarding,
  ST.Training,
  ST.Daycare,
  ST.Fitness,
  ST.MassageWellness,
  ST.SeniorCare,
  ST.Photography,
  ST.Veterinary,
];

// Sanity guard: keep ALL_SERVICE_TYPES in sync with the shared enum tuple.
if (process.env.NODE_ENV !== 'production') {
  const a = [...ALL_SERVICE_TYPES].sort();
  const b = [...SERVICE_TYPES].sort();
  if (a.length !== b.length || a.some((v, i) => v !== b[i])) {
    // eslint-disable-next-line no-console
    console.warn('[service-icons] ALL_SERVICE_TYPES drift from SERVICE_TYPES');
  }
}
