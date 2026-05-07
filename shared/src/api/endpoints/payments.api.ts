import type {
  CreatePaymentIntentDto,
  PaymentIntentResponse,
  StripeConnectOnboardResponse,
} from '../../dto/payment.dto.js';
import type { UUID } from '../../types/common.js';
import type { Payment, StripeAccount } from '../../types/payment.js';
import type { HttpClient } from '../http.js';

export interface EarningsSummary {
  totalCents: number;
  payoutCents: number; // total minus app fees
  payments: Payment[];
}

export class PaymentsApi {
  constructor(private readonly http: HttpClient) {}

  /** Owner: create a Stripe PaymentIntent for a booking. */
  createIntent(body: CreatePaymentIntentDto): Promise<PaymentIntentResponse> {
    return this.http.post('/payments/intent', body);
  }

  /** Provider: kick off Stripe Connect Express onboarding. */
  connectOnboard(): Promise<StripeConnectOnboardResponse> {
    return this.http.post('/payments/connect/onboard');
  }

  /**
   * Provider: current onboarding status. Returns null when the provider hasn't
   * started onboarding yet (no row in stripe_accounts).
   */
  account(): Promise<StripeAccount | null> {
    return this.http.get('/payments/account');
  }

  /** Owner: latest payment for a booking, or null if none. */
  forBooking(bookingId: UUID): Promise<Payment | null> {
    return this.http.get(`/payments/booking/${bookingId}`);
  }

  /** Provider: succeeded payments + sums. */
  earnings(): Promise<EarningsSummary> {
    return this.http.get('/payments/earnings');
  }

  /**
   * Dev-only: tell the in-process Stripe mock to flip a PaymentIntent to
   * succeeded. In real Stripe, the equivalent is `confirmPayment` from
   * Stripe.js after collecting card details. No-op in real mode.
   */
  devConfirm(paymentIntentId: string): Promise<void> {
    return this.http.post(`/payments/dev/confirm/${paymentIntentId}`);
  }
}
