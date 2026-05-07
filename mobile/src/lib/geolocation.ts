import * as Location from 'expo-location';

export interface Coords {
  lat: number;
  lng: number;
}

/** Fallback when permission is denied or geolocation is unavailable. */
export const SEED_LOCATION: Coords = { lat: 40.7128, lng: -74.006 }; // NYC

/**
 * Request foreground location permission and resolve the device's current
 * position. Returns null on denial or hardware failure — callers fall back
 * to manual entry / SEED_LOCATION.
 */
export async function getDeviceLocation(timeoutMs = 8000): Promise<Coords | null> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return null;

    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    if (!pos || typeof (pos as Location.LocationObject).coords?.latitude !== 'number') {
      return null;
    }
    const c = (pos as Location.LocationObject).coords;
    return { lat: c.latitude, lng: c.longitude };
  } catch {
    return null;
  }
}
