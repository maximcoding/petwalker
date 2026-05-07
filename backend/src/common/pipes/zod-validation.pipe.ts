import { type ArgumentMetadata, BadRequestException, type PipeTransform } from '@nestjs/common';
import { type ZodError, type ZodSchema } from 'zod';

/**
 * Decorator-friendly Zod pipe.
 *
 *   @Post()
 *   create(@Body(new ZodValidationPipe(CreateBookingDto)) body: CreateBookingDto) { ... }
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown, _meta: ArgumentMetadata): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(formatError(result.error));
    }
    return result.data;
  }
}

function formatError(err: ZodError): { message: string; code: string; details: unknown } {
  return {
    message: 'Validation failed',
    code: 'VALIDATION_ERROR',
    details: { issues: err.issues },
  };
}
