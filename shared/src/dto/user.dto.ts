import { z } from 'zod';

import { UserRole } from '../enums/user-role.js';

import { AddressInput } from './address.dto.js';

export const UpdateUserDto = z.object({
  fullName: z.string().min(1).max(120).optional(),
  phone: z.string().min(7).max(32).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  role: z.enum([UserRole.Owner, UserRole.Provider, UserRole.Both]).optional(),
  /** Pass `null` to clear the address; omit to leave unchanged. */
  address: AddressInput.nullable().optional(),
});
export type UpdateUserDto = z.infer<typeof UpdateUserDto>;

// Walker-specific DTOs moved to ./service-provider.dto.ts (renamed +
// price split out into per-service offerings).
