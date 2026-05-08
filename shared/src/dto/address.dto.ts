import { z } from 'zod';

/**
 * Reusable address shape for any DTO that accepts an address. Optional
 * lat/lng — clients can submit just `text` and we'll save coordinates as
 * null. Set both or neither; mismatched pairs are silently nulled.
 */
export const AddressInput = z.object({
  text: z.string().min(1).max(500),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
});
export type AddressInput = z.infer<typeof AddressInput>;
