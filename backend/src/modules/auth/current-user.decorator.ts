import { type ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

/**
 * Injects the auth context populated by `CognitoGuard`.
 *
 *   @UseGuards(CognitoGuard)
 *   @Get('me')
 *   me(@CurrentUser() ctx: { sub: string; email: string }) { ... }
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<FastifyRequest>();
  if (!req.auth) {
    throw new Error('CurrentUser used without CognitoGuard');
  }
  return req.auth;
});
