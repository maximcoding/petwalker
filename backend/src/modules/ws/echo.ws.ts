import { Logger } from '@nestjs/common';
import type { FastifyInstance } from 'fastify';

import { registerWsRoute } from './ws.bootstrap.js';

const logger = new Logger('EchoWs');

/**
 * Smoke-test endpoint. Confirms:
 *   - Fastify WS adapter is wired
 *   - subprotocol-based JWT auth works
 *   - shared CognitoJwtVerifier accepts cognito-local tokens
 *
 * Connect from the browser DevTools console once you're signed in:
 *
 *   const t = document.cookie.split('; ').find(c => c.includes('.idToken=')).split('=').slice(1).join('=')
 *   const ws = new WebSocket('ws://localhost:3001/ws/echo', ['bearer.' + t])
 *   ws.onmessage = e => console.log('<<', e.data)
 *   ws.onopen = () => ws.send('hello')
 *
 * Expected: server echoes back `echo: hello`.
 */
export function registerEchoWs(fastify: FastifyInstance): void {
  registerWsRoute(fastify, '/ws/echo', ({ socket, claims }) => {
    logger.log(`ws/echo open for ${claims.email}`);
    socket.send(`hello ${claims.email}`);
    socket.on('message', (raw: Buffer) => {
      const text = raw.toString();
      socket.send(`echo: ${text}`);
    });
    socket.on('close', () => logger.log(`ws/echo closed for ${claims.email}`));
  });
}
