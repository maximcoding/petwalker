import {
  BOOKING_STATUSES,
  PAYMENT_STATUSES,
  PUSH_PLATFORMS,
  SERVICE_TYPES,
  USER_ROLES,
} from '@petwalker/shared/enums';
import { pgEnum } from 'drizzle-orm/pg-core';

// Enum values are imported from @petwalker/shared (single source of truth).
// Each *_VALUES is a literal tuple (`as const satisfies ...`) so Drizzle's
// pgEnum infers the column type as the proper union, not `string`.
export const userRoleEnum = pgEnum('user_role', USER_ROLES);
export const bookingStatusEnum = pgEnum('booking_status', BOOKING_STATUSES);
export const paymentStatusEnum = pgEnum('payment_status', PAYMENT_STATUSES);
export const pushPlatformEnum = pgEnum('push_platform', PUSH_PLATFORMS);
export const serviceTypeEnum = pgEnum('service_type', SERVICE_TYPES);
