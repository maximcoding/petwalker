import './config/load-env.js';
import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';

import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { loadEnv } from './config/env.js';
import { initCognitoJwtVerifier } from './modules/auth/jwt-verifier.js';
import { ChatGateway } from './modules/ws/chat.gateway.js';
import { registerEchoWs } from './modules/ws/echo.ws.js';
import { TrackingGateway } from './modules/ws/tracking.gateway.js';
import { bootstrapWebSockets } from './modules/ws/ws.bootstrap.js';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: env.NODE_ENV === 'development' }),
    { bufferLogs: true },
  );

  // Validation is per-route via ZodValidationPipe (we don't use Nest's class-validator pipe).
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.enableShutdownHooks();

  // Initialise the shared JWT verifier before WS gateways register, so they can
  // synchronously call getCognitoJwtVerifier() during the WS handshake.
  const verifier = initCognitoJwtVerifier(env);
  await verifier.whenReady().catch((err) => {
    Logger.error(`Auth verifier init failed: ${(err as Error).message}`, 'bootstrap');
  });

  // Register the WS adapter and any WS routes BEFORE listen().
  const fastify = await bootstrapWebSockets(app);
  registerEchoWs(fastify);
  app.get(TrackingGateway).register(fastify);
  app.get(ChatGateway).register(fastify);

  await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
  Logger.log(`API on http://localhost:${env.API_PORT}`, 'bootstrap');
}

bootstrap().catch((err) => {
  console.error('Fatal during bootstrap:', err);
  process.exit(1);
});
