import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  Logger,
  type OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { ENV_TOKEN, type Env } from '../../config/env.js';

import {
  CognitoJwtVerifier,
  type CognitoClaims,
  initCognitoJwtVerifier,
} from './jwt-verifier.js';

declare module 'fastify' {
  interface FastifyRequest {
    auth?: { sub: string; email: string; claims: CognitoClaims };
  }
}

/**
 * HTTP guard that verifies a Cognito-issued ID token via the shared
 * CognitoJwtVerifier. The actual JWT logic lives in jwt-verifier.ts so the
 * WS gateways can reuse it during handleConnection.
 */
@Injectable()
export class CognitoGuard implements CanActivate, OnModuleInit {
  private readonly logger = new Logger(CognitoGuard.name);
  private verifier: CognitoJwtVerifier | null = null;

  constructor(@Inject(ENV_TOKEN) private readonly env: Env) {}

  async onModuleInit(): Promise<void> {
    this.verifier = initCognitoJwtVerifier(this.env);
    try {
      await this.verifier.whenReady();
      this.logger.log('Auth verifier ready');
    } catch (err) {
      this.logger.error(`Failed to init auth verifier: ${(err as Error).message}`);
    }
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<FastifyRequest>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer token');
    }
    const token = header.slice('Bearer '.length).trim();

    if (!this.verifier) throw new UnauthorizedException('Auth not ready');

    try {
      const claims = await this.verifier.verify(token);
      if (!claims.email) throw new UnauthorizedException('Token missing email claim');
      req.auth = { sub: claims.sub, email: claims.email, claims };
      return true;
    } catch (err) {
      this.logger.debug(`token rejected: ${(err as Error).message}`);
      throw new UnauthorizedException(`Invalid or expired token: ${(err as Error).message}`);
    }
  }
}

// Re-export so existing imports `import type { CognitoClaims } from './cognito.guard'` keep working.
export type { CognitoClaims };
