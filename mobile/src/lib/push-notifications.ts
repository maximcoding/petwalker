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
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Notifications.isDevice) return null;

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
}
