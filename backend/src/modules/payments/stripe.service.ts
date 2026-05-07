/**
 * StripeService — abstraction over Stripe with two implementations:
 *
 *   • StripeRealService — wraps the `stripe` SDK. Used in prod and any dev
 *     environment that has STRIPE_SECRET_KEY set.
 *   • StripeDevService — purely local. Generates fake IDs (acct_dev_*, pi_dev_*,
 *     ch_dev_*), persists state in our own `payments` / `stripe_accounts`
 *     tables, and emits webhook events through an in-process EventEmitter.
 *     Lets the e2e flow (intent → owner pays → succeeded → booking confirmed)
 *     run without any Stripe network calls. Same code paths as prod.
 *
 * The factory in PaymentsModule picks based on env. Callers depend only on the
 * `StripeService` interface — they never see which impl is wired in.
 */

import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';

import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import Stripe from 'stripe';

import { ENV_TOKEN, type Env } from '../../config/env.js';

export interface StripeAccountSnapshot {
  id: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

export interface CreatePaymentIntentInput {
  amountCents: number;
  applicationFeeCents: number;
  currency: string;
  destinationAccountId: string;
  bookingId: string;
  ownerEmail: string;
}

export interface PaymentIntentSnapshot {
  id: string;
  clientSecret: string;
  status: string;
}

export interface RefundResult {
  refundedCents: number;
}

export interface NormalizedWebhookEvent {
  id: string;
  type:
    | 'account.updated'
    | 'payment_intent.succeeded'
    | 'payment_intent.payment_failed'
    | 'charge.refunded';
  data: {
    paymentIntentId?: string;
    chargeId?: string;
    accountId?: string;
    amountReceived?: number;
    failureReason?: string;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
    detailsSubmitted?: boolean;
    refundedCents?: number;
  };
}

export const STRIPE_SERVICE = Symbol('STRIPE_SERVICE');

/**
 * Common interface — both impls satisfy this; controllers / services depend
 * on it via the STRIPE_SERVICE token.
 */
export interface StripeService {
  isDevMode(): boolean;

  // Connect onboarding
  createConnectAccount(input: { email: string; userId: string }): Promise<StripeAccountSnapshot>;
  createAccountLink(accountId: string, returnUrl: string): Promise<{ url: string; expiresAt: Date }>;
  getAccount(accountId: string): Promise<StripeAccountSnapshot>;

  // Payment intent lifecycle
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentSnapshot>;

  /**
   * Dev-only convenience to immediately move a PaymentIntent from
   * `requires_payment_method` to `succeeded`. Real Stripe does this via the
   * client-side Elements `confirmPayment(...)` call. No-op in real impl.
   */
  devConfirmPaymentIntent(paymentIntentId: string): Promise<void>;

  refundPayment(input: {
    chargeId: string;
    amountCents: number;
  }): Promise<RefundResult>;

  // Webhook handling
  parseWebhookEvent(rawBody: Buffer, signatureHeader: string | undefined): NormalizedWebhookEvent;

  /** Subscribe to in-process webhook events. Dev impl only — real impl uses HTTP. */
  onDevWebhook(listener: (evt: NormalizedWebhookEvent) => void): () => void;
}

// ────────────── REAL ──────────────

@Injectable()
export class StripeRealService implements StripeService {
  private readonly logger = new Logger('StripeReal');
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(@Inject(ENV_TOKEN) private readonly env: Env) {
    if (!env.STRIPE_SECRET_KEY) {
      throw new InternalServerErrorException(
        'STRIPE_SECRET_KEY required to use the real Stripe service',
      );
    }
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' });
    this.webhookSecret = env.STRIPE_WEBHOOK_SECRET ?? '';
    this.logger.log('Stripe real-mode active');
  }

  isDevMode(): boolean {
    return false;
  }

  async createConnectAccount(input: {
    email: string;
    userId: string;
  }): Promise<StripeAccountSnapshot> {
    const acct = await this.stripe.accounts.create({
      type: 'express',
      email: input.email,
      metadata: { userId: input.userId },
    });
    return this.toAccountSnapshot(acct);
  }

  async createAccountLink(
    accountId: string,
    returnUrl: string,
  ): Promise<{ url: string; expiresAt: Date }> {
    const link = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: returnUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
    return { url: link.url, expiresAt: new Date(link.expires_at * 1000) };
  }

  async getAccount(accountId: string): Promise<StripeAccountSnapshot> {
    const acct = await this.stripe.accounts.retrieve(accountId);
    return this.toAccountSnapshot(acct);
  }

  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentSnapshot> {
    const pi = await this.stripe.paymentIntents.create({
      amount: input.amountCents,
      currency: input.currency.toLowerCase(),
      application_fee_amount: input.applicationFeeCents,
      transfer_data: { destination: input.destinationAccountId },
      receipt_email: input.ownerEmail,
      metadata: { bookingId: input.bookingId },
    });
    return {
      id: pi.id,
      clientSecret: pi.client_secret ?? '',
      status: pi.status,
    };
  }

  async devConfirmPaymentIntent(): Promise<void> {
    // No-op in real mode — confirm happens client-side via Stripe.js.
  }

  async refundPayment(input: { chargeId: string; amountCents: number }): Promise<RefundResult> {
    const refund = await this.stripe.refunds.create({
      charge: input.chargeId,
      amount: input.amountCents,
    });
    return { refundedCents: refund.amount };
  }

  parseWebhookEvent(rawBody: Buffer, signatureHeader: string | undefined): NormalizedWebhookEvent {
    if (!signatureHeader) {
      throw new InternalServerErrorException('Missing Stripe-Signature header');
    }
    if (!this.webhookSecret) {
      throw new InternalServerErrorException('STRIPE_WEBHOOK_SECRET not configured');
    }
    const event = this.stripe.webhooks.constructEvent(rawBody, signatureHeader, this.webhookSecret);
    return normaliseStripeEvent(event);
  }

  onDevWebhook(): () => void {
    // No-op in real mode — webhooks come over HTTP.
    return () => {};
  }

  private toAccountSnapshot(acct: Stripe.Account): StripeAccountSnapshot {
    return {
      id: acct.id,
      chargesEnabled: acct.charges_enabled ?? false,
      payoutsEnabled: acct.payouts_enabled ?? false,
      detailsSubmitted: acct.details_submitted ?? false,
    };
  }
}

function normaliseStripeEvent(event: Stripe.Event): NormalizedWebhookEvent {
  switch (event.type) {
    case 'account.updated': {
      const acct = event.data.object as Stripe.Account;
      return {
        id: event.id,
        type: 'account.updated',
        data: {
          accountId: acct.id,
          chargesEnabled: acct.charges_enabled ?? false,
          payoutsEnabled: acct.payouts_enabled ?? false,
          detailsSubmitted: acct.details_submitted ?? false,
        },
      };
    }
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent;
      const charge =
        typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id;
      return {
        id: event.id,
        type: 'payment_intent.succeeded',
        data: {
          paymentIntentId: pi.id,
          chargeId: charge ?? undefined,
          amountReceived: pi.amount_received,
        },
      };
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent;
      return {
        id: event.id,
        type: 'payment_intent.payment_failed',
        data: {
          paymentIntentId: pi.id,
          failureReason: pi.last_payment_error?.message ?? 'unknown',
        },
      };
    }
    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      return {
        id: event.id,
        type: 'charge.refunded',
        data: {
          chargeId: charge.id,
          paymentIntentId:
            typeof charge.payment_intent === 'string'
              ? charge.payment_intent
              : charge.payment_intent?.id,
          refundedCents: charge.amount_refunded,
        },
      };
    }
    default:
      // Anything else is unhandled — return as-is so the controller can no-op.
      return {
        id: event.id,
        type: event.type as NormalizedWebhookEvent['type'],
        data: {},
      };
  }
}

// ────────────── DEV ──────────────

interface DevAccount {
  id: string;
  userId: string;
  email: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

interface DevPaymentIntent {
  id: string;
  bookingId: string;
  amountCents: number;
  applicationFeeCents: number;
  destinationAccountId: string;
  status: 'requires_payment_method' | 'succeeded' | 'failed';
  chargeId: string | null;
  refundedCents: number;
}

const DEV_WEBHOOK_DELAY_MS = 800;

@Injectable()
export class StripeDevService implements StripeService {
  private readonly logger = new Logger('StripeDev');
  private readonly events = new EventEmitter();
  private readonly accounts = new Map<string, DevAccount>(); // by accountId
  private readonly intents = new Map<string, DevPaymentIntent>(); // by intentId

  constructor(@Inject(ENV_TOKEN) private readonly env: Env) {
    this.logger.log('Stripe DEV mode — fake IDs, in-process webhooks, no network');
  }

  isDevMode(): boolean {
    return true;
  }

  async createConnectAccount(input: {
    email: string;
    userId: string;
  }): Promise<StripeAccountSnapshot> {
    const id = `acct_dev_${randomUUID().slice(0, 10)}`;
    const acct: DevAccount = {
      id,
      userId: input.userId,
      email: input.email,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
    };
    this.accounts.set(id, acct);
    return this.toSnapshot(acct);
  }

  async createAccountLink(
    accountId: string,
    _returnUrl: string,
  ): Promise<{ url: string; expiresAt: Date }> {
    // Pretend the provider clicked through onboarding instantly. `_returnUrl`
    // is part of the interface contract but not used in the dev mock — we
    // route to a fake hosted onboarding URL that just signals success.
    const acct = this.accounts.get(accountId);
    if (!acct) throw new InternalServerErrorException('Unknown dev account');
    acct.chargesEnabled = true;
    acct.payoutsEnabled = true;
    acct.detailsSubmitted = true;

    // Fire account.updated so PaymentsService.handleWebhook syncs our DB row.
    setTimeout(() => {
      this.emit({
        id: `evt_dev_${randomUUID().slice(0, 8)}`,
        type: 'account.updated',
        data: {
          accountId: acct.id,
          chargesEnabled: acct.chargesEnabled,
          payoutsEnabled: acct.payoutsEnabled,
          detailsSubmitted: acct.detailsSubmitted,
        },
      });
    }, 100);

    return {
      url: `${this.env.PUBLIC_API_URL}/dev/stripe/onboarded?account=${accountId}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    };
  }

  async getAccount(accountId: string): Promise<StripeAccountSnapshot> {
    const acct = this.accounts.get(accountId);
    if (!acct) throw new InternalServerErrorException('Unknown dev account');
    return this.toSnapshot(acct);
  }

  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentSnapshot> {
    const id = `pi_dev_${randomUUID().slice(0, 12)}`;
    const intent: DevPaymentIntent = {
      id,
      bookingId: input.bookingId,
      amountCents: input.amountCents,
      applicationFeeCents: input.applicationFeeCents,
      destinationAccountId: input.destinationAccountId,
      status: 'requires_payment_method',
      chargeId: null,
      refundedCents: 0,
    };
    this.intents.set(id, intent);
    return {
      id,
      clientSecret: `${id}_secret_dev`,
      status: intent.status,
    };
  }

  async devConfirmPaymentIntent(paymentIntentId: string): Promise<void> {
    const intent = this.intents.get(paymentIntentId);
    if (!intent) throw new InternalServerErrorException('Unknown dev intent');
    if (intent.status !== 'requires_payment_method') return;
    intent.status = 'succeeded';
    intent.chargeId = `ch_dev_${randomUUID().slice(0, 12)}`;

    // Fire `payment_intent.succeeded` after a short delay so the client gets
    // a chance to render its in-flight UI.
    setTimeout(() => {
      this.emit({
        id: `evt_dev_${randomUUID().slice(0, 8)}`,
        type: 'payment_intent.succeeded',
        data: {
          paymentIntentId: intent.id,
          chargeId: intent.chargeId ?? undefined,
          amountReceived: intent.amountCents,
        },
      });
    }, DEV_WEBHOOK_DELAY_MS);
  }

  async refundPayment(input: { chargeId: string; amountCents: number }): Promise<RefundResult> {
    const intent = [...this.intents.values()].find((i) => i.chargeId === input.chargeId);
    if (!intent) throw new InternalServerErrorException('Unknown dev charge');
    intent.refundedCents += input.amountCents;
    setTimeout(() => {
      this.emit({
        id: `evt_dev_${randomUUID().slice(0, 8)}`,
        type: 'charge.refunded',
        data: {
          chargeId: input.chargeId,
          paymentIntentId: intent.id,
          refundedCents: intent.refundedCents,
        },
      });
    }, 100);
    return { refundedCents: input.amountCents };
  }

  parseWebhookEvent(): NormalizedWebhookEvent {
    // Real webhooks don't hit this impl in dev — the in-process emitter does.
    throw new InternalServerErrorException(
      'Dev Stripe service does not parse HTTP webhooks; use onDevWebhook',
    );
  }

  onDevWebhook(listener: (evt: NormalizedWebhookEvent) => void): () => void {
    this.events.on('webhook', listener);
    return () => this.events.off('webhook', listener);
  }

  private emit(evt: NormalizedWebhookEvent): void {
    this.events.emit('webhook', evt);
  }

  private toSnapshot(acct: DevAccount): StripeAccountSnapshot {
    return {
      id: acct.id,
      chargesEnabled: acct.chargesEnabled,
      payoutsEnabled: acct.payoutsEnabled,
      detailsSubmitted: acct.detailsSubmitted,
    };
  }
}

// ────────────── factory ──────────────

import type { FactoryProvider } from '@nestjs/common';

export const stripeServiceProvider: FactoryProvider<StripeService> = {
  provide: STRIPE_SERVICE,
  inject: [ENV_TOKEN],
  useFactory: (env: Env): StripeService => {
    // Real Stripe whenever STRIPE_SECRET_KEY is set, regardless of APP_ENV
    // (so devs can use real Stripe test keys if they want). The pure dev
    // mock is only for the zero-keys path.
    if (env.STRIPE_SECRET_KEY) return new StripeRealService(env);
    return new StripeDevService(env);
  },
};
