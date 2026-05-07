import { Inject, Injectable, Logger } from '@nestjs/common';
import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';

import { AuthService } from '../auth/auth.service.js';
import { BookingsService } from '../bookings/bookings.service.js';
import { WalksService } from '../walks/walks.service.js';

import { RoomRegistry } from './room-registry.js';
import { registerWsRoute, type AuthedWsContext } from './ws.bootstrap.js';

import {
  TrackingPingFrame,
  type GeoSample,
  type TrackingSampleEvent,
  type UUID,
  type WsTrackingClientEvent,
} from '@petwalker/shared';

const FLUSH_INTERVAL_MS = 10_000;
const FLUSH_BATCH_SIZE = 50;

interface ProviderState {
  walkId: UUID;
  bookingId: UUID;
  buffer: GeoSample[];
  timer: NodeJS.Timeout | null;
}

/**
 * `/ws/tracking` — live GPS ping fanout.
 *
 * Connect with subprotocol `bearer.<jwt>` and query string `?bookingId=<uuid>`.
 *
 * Behaviour:
 *   • viewer must be the booking's owner OR provider
 *   • walks row must exist (booking has been started) and not be ended
 *   • provider can send `tracking:ping` events; buffered + flushed to
 *     walks.polyline every 10s OR every 50 samples
 *   • all subscribers (provider + owner) receive `tracking:sample` fanout
 *
 * Single-instance only for M3. M6 adds Redis pub/sub fanout with the same
 * RoomRegistry interface.
 */
@Injectable()
export class TrackingGateway {
  private readonly logger = new Logger('TrackingWs');
  private readonly rooms = new RoomRegistry();
  private readonly providerState = new WeakMap<WebSocket, ProviderState>();

  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(BookingsService) private readonly bookings: BookingsService,
    @Inject(WalksService) private readonly walks: WalksService,
  ) {}

  register(fastify: FastifyInstance): void {
    registerWsRoute(fastify, '/ws/tracking', (ctx) => this.handle(ctx));
    this.logger.log('/ws/tracking registered');
  }

  private async handle(ctx: AuthedWsContext): Promise<void> {
    const { socket, claims, query } = ctx;
    const bookingId = query.bookingId;
    if (!bookingId) {
      socket.close(4400, 'Missing bookingId');
      return;
    }

    // Resolve viewer to a User row (creates if first time).
    const me = await this.resolveUser(claims.sub, claims.email);
    if (!me) {
      socket.close(4401, 'Unauthorized');
      return;
    }

    // Membership + active-walk check.
    const booking = await this.bookings.get(me.id, bookingId).catch(() => null);
    if (!booking) {
      socket.close(4403, 'Not your booking');
      return;
    }
    const walk = await this.walks.findActiveWalkForBooking(bookingId);
    if (!walk) {
      socket.close(4404, 'Walk not in progress');
      return;
    }

    const room = `walk:${walk.id}`;
    const isProvider = booking.providerId === me.id;
    this.rooms.join(room, socket);
    this.logger.debug(`join ${room} ${isProvider ? 'provider' : 'owner'}=${me.id}`);

    // Greet the new subscriber with the current trail.
    socket.send(
      JSON.stringify({
        type: 'tracking:started',
        walkId: walk.id,
        bookingId,
        startedAt: walk.startedAt ?? null,
      }),
    );

    if (isProvider) {
      this.providerState.set(socket, {
        walkId: walk.id,
        bookingId,
        buffer: [],
        timer: null,
      });
    }

    socket.on('message', (raw: Buffer) => {
      this.onMessage(socket, room, isProvider, raw).catch((err) => {
        this.logger.warn(`tracking msg error: ${(err as Error).message}`);
      });
    });

    socket.on('close', () => {
      this.rooms.leave(room, socket);
      if (isProvider) void this.flush(socket);
      this.logger.debug(`leave ${room} (size=${this.rooms.size(room)})`);
    });
  }

  // ────────────── private ──────────────

  private async resolveUser(
    cognitoSub: string,
    email: string,
  ): Promise<{ id: string } | null> {
    try {
      return await this.auth.upsertUser(cognitoSub, email);
    } catch {
      return null;
    }
  }

  private async onMessage(
    socket: WebSocket,
    room: string,
    isProvider: boolean,
    raw: Buffer,
  ): Promise<void> {
    if (!isProvider) return; // owners are read-only on tracking

    const text = raw.toString();
    let evt: WsTrackingClientEvent;
    try {
      evt = JSON.parse(text) as WsTrackingClientEvent;
    } catch {
      return; // ignore malformed
    }
    if (evt.type !== 'tracking:ping') return;

    const state = this.providerState.get(socket);
    if (!state) return;

    // Validate the inner sample with the shared zod schema. The wire shape uses
    // the existing TrackingPingFrame DTO — flatten the discriminated union.
    const parsed = TrackingPingFrame.safeParse({
      walkId: evt.walkId,
      lat: evt.sample.lat,
      lng: evt.sample.lng,
      t: evt.sample.t,
      accuracy: evt.sample.accuracy,
    });
    if (!parsed.success) return;
    if (parsed.data.walkId !== state.walkId) return;

    const sample: GeoSample = {
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      t: parsed.data.t,
      ...(parsed.data.accuracy != null ? { accuracy: parsed.data.accuracy } : {}),
    };

    // Fanout immediately so subscribers see live updates.
    const out: TrackingSampleEvent = {
      type: 'tracking:sample',
      walkId: state.walkId,
      sample,
    };
    this.rooms.broadcast(room, out);

    // Buffer for batched persist.
    state.buffer.push(sample);
    if (state.buffer.length >= FLUSH_BATCH_SIZE) {
      await this.flush(socket);
    } else if (!state.timer) {
      state.timer = setTimeout(() => {
        void this.flush(socket);
      }, FLUSH_INTERVAL_MS);
    }
  }

  private async flush(socket: WebSocket): Promise<void> {
    const state = this.providerState.get(socket);
    if (!state) return;
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
    if (state.buffer.length === 0) return;
    const batch = state.buffer;
    state.buffer = [];
    try {
      await this.walks.appendSamples(state.walkId, batch);
    } catch (err) {
      this.logger.error(
        `polyline flush failed for walk ${state.walkId}: ${(err as Error).message}`,
      );
      // Re-queue on failure so we don't lose samples.
      state.buffer = [...batch, ...state.buffer];
    }
  }
}
