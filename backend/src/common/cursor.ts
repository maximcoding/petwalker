import { BadRequestException } from '@nestjs/common';

/**
 * Opaque cursor encoding — base64-encoded JSON.
 * The shape is internal to the producing endpoint; clients must treat it as a string.
 *
 * Decoding is type-checked at the call site (we just JSON-parse and trust it),
 * but a malformed cursor throws a 400.
 */
export function encodeCursor(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeCursor<T>(cursor: string | undefined): T | null {
  if (!cursor) return null;
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf8');
    return JSON.parse(json) as T;
  } catch {
    throw new BadRequestException('Invalid cursor');
  }
}
