import { Inject, Injectable, Logger } from '@nestjs/common';
import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';

import { AuthService } from '../auth/auth.service.js';
import { MessagesService } from '../messages/messages.service.js';

import { RoomRegistry } from './room-registry.js';
import { registerWsRoute, type AuthedWsContext } from './ws.bootstrap.js';

import {
  type ChatMessageEvent,
  type ChatSendEvent,
  type WsChatClientEvent,
} from '@petwalker/shared';

/**
 * `/ws/chat` — owner ↔ provider chat per booking.
 *
 * Connect with subprotocol `bearer.<jwt>` and `?bookingId=<uuid>`.
 *
 * Behaviour:
 *   • viewer must be the booking's owner OR provider (assertMember)
 *   • on `chat:send`, persist via MessagesService.send and fanout
 *     `chat:message` (with the saved Message, including server-assigned id
 *     and sentAt) to the room
 *   • REST history (GET /bookings/:id/messages) is loaded by the client
 *     once on join; everything after that streams here
 */
@Injectable()
export class ChatGateway {
  private readonly logger = new Logger('ChatWs');
  private readonly rooms = new RoomRegistry();

  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(MessagesService) private readonly messages: MessagesService,
  ) {}

  register(fastify: FastifyInstance): void {
    registerWsRoute(fastify, '/ws/chat', (ctx) => this.handle(ctx));
    this.logger.log('/ws/chat registered');
  }

  private async handle(ctx: AuthedWsContext): Promise<void> {
    const { socket, claims, query } = ctx;
    const bookingId = query.bookingId;
    if (!bookingId) {
      socket.close(4400, 'Missing bookingId');
      return;
    }

    const me = await this.auth.upsertUser(claims.sub, claims.email).catch(() => null);
    if (!me) {
      socket.close(4401, 'Unauthorized');
      return;
    }

    try {
      await this.messages.assertMember(me.id, bookingId);
    } catch {
      socket.close(4403, 'Not your booking');
      return;
    }

    const room = `booking:${bookingId}:chat`;
    this.rooms.join(room, socket);
    this.logger.debug(`join ${room} user=${me.id}`);

    socket.on('message', (raw: Buffer) => {
      this.onMessage(socket, room, me.id, bookingId, raw).catch((err) => {
        this.logger.warn(`chat msg error: ${(err as Error).message}`);
      });
    });

    socket.on('close', () => {
      this.rooms.leave(room, socket);
      this.logger.debug(`leave ${room} (size=${this.rooms.size(room)})`);
    });
  }

  private async onMessage(
    socket: WebSocket,
    room: string,
    senderId: string,
    bookingId: string,
    raw: Buffer,
  ): Promise<void> {
    const text = raw.toString();
    let evt: WsChatClientEvent;
    try {
      evt = JSON.parse(text) as WsChatClientEvent;
    } catch {
      return;
    }
    if (evt.type !== 'chat:send') return;
    const send = evt as ChatSendEvent;
    if (send.bookingId !== bookingId) {
      // The room is keyed to bookingId in the URL; cross-booking sends are an error.
      socket.send(JSON.stringify({ type: 'chat:error', error: 'bookingId mismatch' }));
      return;
    }
    const body = (send.body ?? '').trim();
    if (!body) return;

    const message = await this.messages.send(senderId, bookingId, { body });
    const out: ChatMessageEvent = { type: 'chat:message', message };
    this.rooms.broadcast(room, out);
  }
}
