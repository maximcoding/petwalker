import { z } from 'zod';

import { UserRole } from '../enums/user-role.js';
import { SUPPORTED_CURRENCIES } from '../types/user.js';

import { AddressInput } from './address.dto.js';

export const UpdateUserDto = z.object({
  fullName: z.string().min(1).max(120).optional(),
  phone: z.string().min(7).max(32).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  role: z.enum([UserRole.Owner, UserRole.Provider, UserRole.Both]).optional(),
  /**
   * Profile bio. Pass `null` to clear, omit to leave unchanged. Cap at
   * 600 chars — long enough for a paragraph, short enough that the UI
   * can render it inline without a "show more" affordance.
   */
  aboutMe: z.string().max(600).nullable().optional(),
  /**
   * ISO-4217 code from `SUPPORTED_CURRENCIES`. Pass `null` to clear (the
   * UI falls back to USD), omit to leave unchanged.
   */
  preferredCurrency: z.enum(SUPPORTED_CURRENCIES).nullable().optional(),
  /** Pass `null` to clear the address; omit to leave unchanged. */
  address: AddressInput.nullable().optional(),
});
export type UpdateUserDto = z.infer<typeof UpdateUserDto>;

// Walker-specific DTOs moved to ./service-provider.dto.ts (renamed +
// price split out into per-service offerings).
