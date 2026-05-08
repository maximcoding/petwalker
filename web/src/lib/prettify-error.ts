import type { TFunction } from 'i18next';

/**
 * Maps backend error messages / codes to friendly i18n strings.
 *
 * Backend exceptions surface as either:
 *   • plain strings ("Cannot start a confirmed booking")
 *   • UnprocessableEntityException with `code` field embedded in message
 *   • network failures from fetch (TypeError "Failed to fetch")
 *
 * Anything we don't recognise falls through to `errors.generic` plus the raw
 * message (useful in dev) — production should swap the raw message for nothing.
 */
export function prettifyError(t: TFunction, raw: unknown): string {
  const message =
    raw instanceof Error
      ? raw.message
      : typeof raw === 'string'
        ? raw
        : 'unknown';

  // Network / connectivity
  if (message.includes('Failed to fetch') || message.toLowerCase().includes('network')) {
    return t('errors.network');
  }

  // Auth
  if (message.includes('Missing Bearer token') || message.includes('Invalid or expired token')) {
    return t('errors.sessionExpired');
  }

  // Booking-specific
  if (message.includes('OUTSIDE_AVAILABILITY')) return t('errors.outsideAvailability');
  if (message.includes('OVERLAPPING_BOOKING')) return t('errors.overlappingBooking');
  if (message.includes('EXTERNAL_CALENDAR_CONFLICT')) return t('errors.externalCalendarConflict');
  if (message.includes('PROVIDER_NO_OFFERING')) return t('errors.providerNoOffering');
  if (message.includes('SCHEDULED_AT_TOO_SOON')) return t('errors.scheduledTooSoon');
  if (message.includes('PROVIDER_NOT_ONBOARDED')) return t('errors.providerNotOnboarded');
  if (message.includes('OWNER_ADDRESS_MISSING')) return t('errors.ownerAddressMissing');
  if (message.includes('PROVIDER_ADDRESS_MISSING')) return t('errors.providerAddressMissing');
  if (message.includes('CUSTOM_ADDRESS_REQUIRED')) return t('errors.customAddressRequired');

  // Specific HTTP-like status hints in message
  if (message.includes('Forbidden') || message.includes('Not your booking')) {
    return t('errors.forbidden');
  }
  if (message.includes('Not found')) return t('errors.notFound');
  if (message.includes('No values to set')) return t('errors.nothingChanged');

  return message; // fall through with raw — better than hiding the cause
}
