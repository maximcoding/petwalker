import { Inject, Injectable, Logger } from '@nestjs/common';
import type { FastifyInstance } from 'fastify';

import { AuthService } from '../auth/auth.service.js';

import { RoomRegistry } from './room-registry.js';
import { registerWsRoute, type AuthedWsContext } from './ws.bootstrap.js';

@Injectable()
export class WebNotificationsGateway {
  private readonly logger = new Logger('WebNotificationsWs');
  private readonly rooms = new RoomRegistry();

  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  register(fastify: FastifyInstance): void {
    registerWsRoute(fastify, '/ws/notifications', (ctx) => this.handle(ctx));
    this.logger.log('/ws/notifications registered');
  }

  getBroadcast(): (room: string, payload: unknown) => void {
    return (room: string, payload: unknown) => this.rooms.broadcast(room, payload);
  }

  private async handle(ctx: AuthedWsContext): Promise<void> {
    const { socket, claims } = ctx;

    const me = await this.auth.upsertUser(claims.sub, claims.email).catch(() => null);
    if (!me) {
      socket.close(4401, 'Unauthorized');
      return;
    }

    const room = `user:${me.id}:notifications`;
    this.rooms.join(room, socket);
    this.logger.debug(`join ${room}`);

    socket.on('close', () => {
      this.rooms.leave(room, socket);
    });
  }
}
