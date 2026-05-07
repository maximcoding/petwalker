import * as Location from 'expo-location';

import type { GeoSample } from '@petwalker/shared';

let watchSub: Location.LocationSubscription | null = null;

/**
 * Foreground-only GPS tracking for an active walk. The provider's app stays in
 * the foreground for M3 — true background tracking with expo-task-manager
 * lands in M5/M6 once we've validated the live-update flow on real devices.
 *
 * Permission is requested on demand. Returns false if the user declines.
 */
export async function startWalkTracking(
  onSample: (sample: GeoSample) => void,
): Promise<boolean> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (!perm.granted) return false;

  // Stop any prior subscription so we don't double-track if start() is hit twice.
  await stopWalkTracking();

  watchSub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 5,
    },
    (pos) => {
      const c = pos.coords;
      onSample({
        lat: c.latitude,
        lng: c.longitude,
        t: pos.timestamp,
        ...(typeof c.accuracy === 'number' ? { accuracy: c.accuracy } : {}),
      });
    },
  );
  return true;
}

export async function stopWalkTracking(): Promise<void> {
  if (watchSub) {
    watchSub.remove();
    watchSub = null;
  }
}
