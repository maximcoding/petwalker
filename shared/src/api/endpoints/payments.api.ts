import type {
  BillingHistoryQuery,
  CreatePaymentIntentDto,
  DevAttachPaymentMethodDto,
  PaymentIntentResponse,
  SetupIntentResponse,
  StripeConnectOnboardResponse,
} from '../../dto/payment.dto.js';
import type { UUID } from '../../types/common.js';
import type {
  BillingHistoryEntry,
  Payment,
  SavedPaymentMethod,
  StripeAccount,
} from '../../types/payment.js';
import type { HttpClient } from '../http.js';

export interface BillingHistoryPageDto {
  items: BillingHistoryEntry[];
  nextCursor: string | null;
}

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

  // ─────── saved cards (Phase 3) ─────────────────────────────────────

  /** Mints a SetupIntent for client-side Elements card collection. */
  createSetupIntent(): Promise<SetupIntentResponse> {
    return this.http.post('/payments/payment-methods/setup-intent');
  }

  /** Lists the user's saved cards. Returns [] when nothing's been saved. */
  listPaymentMethods(): Promise<SavedPaymentMethod[]> {
    return this.http.get('/payments/payment-methods');
  }

  removePaymentMethod(paymentMethodId: string): Promise<void> {
    return this.http.delete(`/payments/payment-methods/${paymentMethodId}`);
  }

  /**
   * Dev-only fast path — refused by the backend when STRIPE_SECRET_KEY
   * is set. Lets the dev UI synthesize fake `pm_dev_*` methods directly
   * without pulling Stripe.js / publishable keys.
   */
  devAttachPaymentMethod(body: DevAttachPaymentMethodDto): Promise<SavedPaymentMethod> {
    return this.http.post('/payments/payment-methods/dev', body);
  }

  /** Owner-side billing history — paginated. */
  billing(query?: Partial<BillingHistoryQuery>): Promise<BillingHistoryPageDto> {
    const qs = new URLSearchParams();
    if (query?.cursor) qs.set('cursor', query.cursor);
    if (query?.limit != null) qs.set('limit', String(query.limit));
    const suffix = qs.toString() ? `?${qs}` : '';
    return this.http.get(`/payments/billing${suffix}`);
  }

  /**
   * Fetches the booking-invoice PDF as raw bytes. The endpoint sits
   * behind CognitoGuard so a plain `<a href>` won't carry auth — the UI
   * pipes this Blob into URL.createObjectURL + `<a download>` instead.
   */
  invoicePdf(bookingId: UUID): Promise<Blob> {
    return this.http.getBlob(`/payments/booking/${bookingId}/invoice.pdf`);
  }
}
