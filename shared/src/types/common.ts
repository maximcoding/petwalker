/** ISO-8601 timestamp string. */
export type ISODateString = string;

/** UUID v4 string. */
export type UUID = string;

/**
 * Cursor-based page — for infinite scroll lists.
 * `nextCursor` is opaque (base64 JSON); pass it back to fetch the next slice.
 * `null` means there are no more items.
 */
export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

/**
 * @deprecated use CursorPage<T>. Offset pagination is not used in petwalker —
 * left in place only for any external code that may have referenced it.
 */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** A standard error envelope returned by the API. */
export interface ApiError {
  statusCode: number;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

/** Lat/lng tuple. */
export interface LatLng {
  lat: number;
  lng: number;
}

/** A GPS sample with timestamp. */
export interface GeoSample extends LatLng {
  /** Unix epoch ms when sample was captured on the device. */
  t: number;
  /** Device-reported accuracy in metres, if known. */
  accuracy?: number;
}
