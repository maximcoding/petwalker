import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

import {
  configureForegroundHandler,
  registerForPushNotifications,
} from '@/lib/push-notifications';

export function usePushNotifications(): void {
  const router = useRouter();

  useEffect(() => {
    configureForegroundHandler();
    void registerForPushNotifications();

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string> | undefined;
      const deepLink = data?.deepLink;
      if (!deepLink) return;

      try {
        const url = new URL(deepLink);
        // For custom schemes (petwalker://bookings/<id>), the host is the resource type
        // and the pathname starts with '/' followed by the id.
        const resource = url.hostname;
        const resourceId = url.pathname.slice(1);
        if (resource === 'bookings' && resourceId) {
          router.push(`/(tabs)/bookings/${resourceId}` as never);
        }
      } catch {
        // Malformed deepLink — ignore
      }
    });

    return () => sub.remove();
  }, [router]);
}
