import { z } from 'zod';

export const CreateBlackoutSchema = z
  .object({
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
    reason: z.string().max(200).optional(),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: 'endDate must be ≥ startDate',
    path: ['endDate'],
  });

export type CreateBlackoutDto = z.infer<typeof CreateBlackoutSchema>;
