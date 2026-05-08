import { Injectable, Logger } from '@nestjs/common';
import { Expo, type ExpoPushMessage } from 'expo-server-sdk';

import { ENV_TOKEN, type Env } from '../../config/env.js';

export const PUSH_DISPATCHER = Symbol('PUSH_DISPATCHER');

export interface PushDispatcher {
  send(messages: ExpoPushMessage[]): Promise<void>;
}

@Injectable()
export class ExpoDispatcher implements PushDispatcher {
  private readonly expo: Expo;
  private readonly logger = new Logger(ExpoDispatcher.name);

  constructor(accessToken: string | undefined) {
    this.expo = new Expo({ accessToken });
  }

  async send(messages: ExpoPushMessage[]): Promise<void> {
    const chunks = this.expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      const receipts = await this.expo.sendPushNotificationsAsync(chunk);
      for (const r of receipts) {
        if (r.status === 'error') {
          this.logger.warn(`Expo push error: ${r.message}`);
        }
      }
    }
  }
}

@Injectable()
export class DevLogDispatcher implements PushDispatcher {
  private readonly logger = new Logger(DevLogDispatcher.name);

  async send(messages: ExpoPushMessage[]): Promise<void> {
    for (const m of messages) {
      this.logger.debug(`[DEV PUSH] to=${String(m.to)} title="${m.title as string}" body="${m.body as string}"`);
    }
  }
}

export const pushDispatcherProvider = {
  provide: PUSH_DISPATCHER,
  inject: [ENV_TOKEN],
  useFactory: (env: Env): PushDispatcher =>
    env.APP_ENV === 'prod'
      ? new ExpoDispatcher(env.EXPO_ACCESS_TOKEN)
      : new DevLogDispatcher(),
};
