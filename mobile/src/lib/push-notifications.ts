import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from './api';

export function configureForegroundHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Request permission, get Expo push token, register with backend.
 * Safe to call on every app boot — backend upsert is idempotent.
 * Returns null on simulators and when permission is denied.
 *
 * SDK 51 dropped `Notifications.isDevice` (it lived in expo-device,
 * but we don't pull that in to keep deps lean). On a simulator
 * `getExpoPushTokenAsync()` throws — we catch and treat that as
 * "not a real device, no token", same observable behaviour.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const expoToken = tokenData.data;

    await api.push.register({
      expoToken,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });

    return expoToken;
  } catch {
    // Simulator, missing permission, network failure — all paths that
    // legitimately mean "no push token this session". Caller treats
    // null as "skip push features".
    return null;
  }
}
