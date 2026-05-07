/**
 * Money — integer-cents value object. Avoids floating-point arithmetic.
 *
 *   const fee = Money.fromCents(2500, 'USD'); // $25.00
 *   fee.add(Money.fromCents(500)).toString(); // "$30.00"
 */
export class Money {
  readonly cents: number;
  readonly currency: string;

  constructor(cents: number, currency = 'USD') {
    if (!Number.isInteger(cents)) throw new Error('Money cents must be an integer');
    this.cents = cents;
    this.currency = currency.toUpperCase();
  }

  static fromCents(cents: number, currency = 'USD'): Money {
    return new Money(cents, currency);
  }

  static fromMajor(amount: number, currency = 'USD'): Money {
    return new Money(Math.round(amount * 100), currency);
  }

  static zero(currency = 'USD'): Money {
    return new Money(0, currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.cents + other.cents, this.currency);
  }

  sub(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.cents - other.cents, this.currency);
  }

  /** Multiply by an integer or fractional factor; rounds to nearest cent. */
  mul(factor: number): Money {
    return new Money(Math.round(this.cents * factor), this.currency);
  }

  isZero(): boolean {
    return this.cents === 0;
  }

  isNegative(): boolean {
    return this.cents < 0;
  }

  toMajor(): number {
    return this.cents / 100;
  }

  toString(locale = 'en-US'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.currency,
    }).format(this.toMajor());
  }

  toJSON(): { cents: number; currency: string } {
    return { cents: this.cents, currency: this.currency };
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
  }
}
