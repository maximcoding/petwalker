export const UserRole = {
  Owner: 'owner',
  Provider: 'provider',
  Both: 'both',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/**
 * Literal tuple — preserves narrow types so Drizzle's `pgEnum` infers the
 * column type as the union, not `string`. The `satisfies` clause catches
 * typos and out-of-order values at compile time.
 */
export const USER_ROLES = ['owner', 'provider', 'both'] as const satisfies readonly UserRole[];
