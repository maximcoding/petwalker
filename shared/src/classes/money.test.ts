import { describe, expect, it } from 'vitest';

import { Money } from './money.js';

describe('Money', () => {
  it('constructs from integer cents', () => {
    expect(new Money(2500).cents).toBe(2500);
    expect(new Money(2500).currency).toBe('USD');
  });

  it('rejects non-integer cents', () => {
    expect(() => new Money(2500.5)).toThrow(/integer/);
  });

  it('fromMajor rounds to nearest cent', () => {
    expect(Money.fromMajor(25.255).cents).toBe(2526);
    expect(Money.fromMajor(25.254).cents).toBe(2525);
  });

  it('add same currency', () => {
    const a = Money.fromCents(1000);
    const b = Money.fromCents(500);
    expect(a.add(b).cents).toBe(1500);
  });

  it('sub same currency', () => {
    expect(Money.fromCents(1000).sub(Money.fromCents(300)).cents).toBe(700);
  });

  it('throws on currency mismatch', () => {
    expect(() => Money.fromCents(100, 'USD').add(Money.fromCents(100, 'EUR'))).toThrow(/mismatch/);
  });

  it('mul rounds to nearest cent', () => {
    expect(Money.fromCents(1000).mul(0.15).cents).toBe(150);
    expect(Money.fromCents(333).mul(0.5).cents).toBe(167); // 166.5 → 167
  });

  it('isZero / isNegative', () => {
    expect(Money.zero().isZero()).toBe(true);
    expect(Money.fromCents(-100).isNegative()).toBe(true);
    expect(Money.fromCents(100).isNegative()).toBe(false);
  });

  it('toString formats by locale', () => {
    expect(Money.fromCents(2500).toString('en-US')).toBe('$25.00');
  });

  it('toJSON serialises as { cents, currency }', () => {
    expect(Money.fromCents(2500).toJSON()).toEqual({ cents: 2500, currency: 'USD' });
  });
});
