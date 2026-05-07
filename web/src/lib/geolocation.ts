'use client';

export interface Coords {
  lat: number;
  lng: number;
}

export const SEED_LOCATION: Coords = { lat: 40.7128, lng: -74.006 }; // NYC

/**
 * Browser geolocation as a Promise. Returns null on permission denied or
 * unavailable — caller can fall back to manual entry / seed location.
 */
export function getBrowserLocation(timeoutMs = 8000): Promise<Coords | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}
