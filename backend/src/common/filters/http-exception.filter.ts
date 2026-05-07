import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

import type { ApiError } from '@petwalker/shared/types';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<FastifyReply>();
    const req = ctx.getRequest<FastifyRequest>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: ApiError = {
      statusCode: status,
      message: 'Internal server error',
    };

    if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST;
      body = {
        statusCode: status,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: { issues: exception.issues },
      };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      body = typeof r === 'string'
        ? { statusCode: status, message: r }
        : { statusCode: status, ...(r as object) } as ApiError;
    } else if (exception instanceof Error) {
      this.logger.error(exception.stack ?? exception.message);
      body.message = exception.message;
      // dev-only: surface stack so debugging through the browser is possible
      if (process.env.NODE_ENV !== 'production') {
        (body as ApiError & { stack?: string }).stack = exception.stack;
      }
    }

    if (status >= 500) {
      this.logger.error(`${req.method} ${req.url} → ${status}`, exception);
    }

    void res.status(status).send(body);
  }
}
