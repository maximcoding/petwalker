import type { ISODateString, UUID } from './common.js';

/** A date range during which a provider is unavailable. */
export interface ProviderBlackout {
  id: UUID;
  providerId: UUID;
  /** Inclusive start date, 'YYYY-MM-DD'. */
  startDate: string;
  /** Inclusive end date, 'YYYY-MM-DD'. */
  endDate: string;
  /** Optional label shown to owners, e.g. "Summer vacation". */
  reason: string | null;
  createdAt: ISODateString;
}
