import fastifyWebsocket from '@fastify/websocket';
import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { WebSocket } from 'ws';

import {
  type CognitoClaims,
  getCognitoJwtVerifier,
} from '../auth/jwt-verifier.js';

const logger = new Logger('Ws');

export interface AuthedWsContext {
  socket: WebSocket;
  req: FastifyRequest;
  claims: CognitoClaims;
  query: Record<string, string>;
}

export type WsHandler = (ctx: AuthedWsContext) => void | Promise<void>;

/**
 * Boot @fastify/websocket and return the underlying Fastify instance so
 * gateways can register paths on it via `registerWsRoute`.
 */
export async function bootstrapWebSockets(app: NestFastifyApplication): Promise<FastifyInstance> {
  const instance = app.getHttpAdapter().getInstance();
  // `@fastify/websocket@10` is typed against fastify@5's FastifyTypeProvider;
  // we're on fastify@4 (Nest 10 transitively). Runtime is fine — typing isn't.
  // Cast the plugin and the return value rather than downgrading.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await instance.register(fastifyWebsocket as any, {
    options: {
      maxPayload: 64 * 1024, // 64 KB — chat messages and pings are tiny
    },
  });
  logger.log('@fastify/websocket registered');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return instance as any;
}

/**
 * Register an authenticated WebSocket route. Token comes from the
 * `Sec-WebSocket-Protocol` subprotocol header as `bearer.<jwt>` — works for
 * both browsers (which can't set arbitrary headers on `new WebSocket(...)`)
 * and native clients.
 *
 * The handler is invoked AFTER auth succeeds, so handlers never see
 * unauthenticated sockets.
 */
export function registerWsRoute(
  fastify: FastifyInstance,
  path: string,
  handler: WsHandler,
): void {
  fastify.get(
    path,
    { websocket: true },
    async (connection, req) => {
      // @fastify/websocket@10 passes the WebSocket directly as the first arg.
      // (v8 wrapped it in a SocketStream — that's `connection.socket`. The
      // type schism noted in `bootstrapWebSockets` extends here.)
      const socket = connection as unknown as WebSocket;
      try {
        // Browsers send subprotocols in `Sec-WebSocket-Protocol`. We accept the
        // protocol named `bearer.<jwt>` and echo it back so the handshake closes
        // cleanly.
        const protoHeader = req.headers['sec-websocket-protocol'];
        const protos = parseSubprotocols(protoHeader);
        const bearer = protos.find((p) => p.startsWith('bearer.'));
        if (!bearer) {
          socket.close(4401, 'Missing bearer subprotocol');
          return;
        }
        const token = bearer.slice('bearer.'.length);
        const claims = await getCognitoJwtVerifier().verify(token);

        const url = new URL(req.url, `http://${req.headers.host}`);
        const query: Record<string, string> = {};
        url.searchParams.forEach((v, k) => {
          query[k] = v;
        });

        await handler({ socket, req, claims, query });
      } catch (err) {
        logger.warn(`ws auth failed at ${path}: ${(err as Error).message}`);
        socket.close(4401, 'Unauthorized');
      }
    },
  );
}

function parseSubprotocols(header: string | string[] | undefined): string[] {
  if (!header) return [];
  const raw = Array.isArray(header) ? header.join(',') : header;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}
