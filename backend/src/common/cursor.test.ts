import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { decodeCursor, encodeCursor } from './cursor.js';

describe('cursor', () => {
  it('encodes + decodes roundtrip', () => {
    const payload = { t: '2027-01-01T00:00:00Z', id: 'abc-123' };
    const cursor = encodeCursor(payload);
    expect(typeof cursor).toBe('string');
    expect(decodeCursor<typeof payload>(cursor)).toEqual(payload);
  });

  it('decodes nested objects + arrays', () => {
    const payload = { d: 1234, ids: ['a', 'b'], nested: { x: 1 } };
    expect(decodeCursor(encodeCursor(payload))).toEqual(payload);
  });

  it('decode of undefined → null', () => {
    expect(decodeCursor(undefined)).toBeNull();
  });

  it('decode of garbage → BadRequestException', () => {
    expect(() => decodeCursor('not-base64-!@#$')).toThrow(BadRequestException);
  });

  it('decode of valid base64 but non-JSON → BadRequestException', () => {
    const notJson = Buffer.from('hello world', 'utf8').toString('base64url');
    expect(() => decodeCursor(notJson)).toThrow(BadRequestException);
  });
});
