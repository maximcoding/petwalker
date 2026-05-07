import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, desc, eq, sql, sum } from 'drizzle-orm';

import { DRIZZLE_DB } from '../../database/database.module.js';
import type { Database } from '../../db/client.js';
import {
  bookings,
  payments,
  stripeAccounts,
  type PaymentRow,
  type StripeAccountRow,
} from '../../db/schema/index.js';

import { mapPaymentRow, mapStripeAccountRow } from './payment.mapper.js';
import {
  STRIPE_SERVICE,
  type NormalizedWebhookEvent,
  type StripeService,
} from './stripe.service.js';

import { PaymentStatus } from '@petwalker/shared/enums';

import type { Payment, StripeAccount, UUID } from '@petwalker/shared';

const APPLICATION_FEE_PCT = 0.15; // matches cancellation-policy.ts

export interface OnboardLinkResult {
  url: string;
  expiresAt: string;
}

export interface CreatedPaymentIntent {
  paymentIntentId: string;
  clientSecret: string;
}

export interface EarningsSummary {
  totalCents: number;
  payoutCents: number;
  payments: Payment[];
}

@Injectable()
export class PaymentsService implements OnModuleInit {
  private readonly logger = new Logger(PaymentsService.name);
  /** Webhook idempotency — track event ids we've already processed in-memory. */
  private readonly seenEventIds = new Set<string>();

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: Database,
    @Inject(STRIPE_SERVICE) private readonly stripe: StripeService,
  ) {}

  onModuleInit(): void {
    if (this.stripe.isDevMode()) {
      this.stripe.onDevWebhook((evt) => {
        this.handleWebhookEvent(evt).catch((err) => {
          this.logger.error(`dev webhook handler failed: ${(err as Error).message}`);
        });
      });
    }
  }

  // ────────────── connect onboarding ──────────────

  async getOrCreateAccount(provider: {
    id: UUID;
    email: string;
  }): Promise<StripeAccount> {
    const existing = await this.findAccountRow(provider.id);
    if (existing) return mapStripeAccountRow(existing);

    const snapshot = await this.stripe.createConnectAccount({
      email: provider.email,
      userId: provider.id,
    });
    const [row] = await this.db
      .insert(stripeAccounts)
      .values({
        userId: provider.id,
        stripeAccountId: snapshot.id,
        chargesEnabled: snapshot.chargesEnabled,
        payoutsEnabled: snapshot.payoutsEnabled,
        detailsSubmitted: snapshot.detailsSubmitted,
      })
      .returning();
    if (!row) throw new Error('account insert returned no row');
    return mapStripeAccountRow(row as StripeAccountRow);
  }

  async createOnboardLink(
    provider: { id: UUID; email: string },
    returnUrl: string,
  ): Promise<OnboardLinkResult> {
    const account = await this.getOrCreateAccount(provider);
    const link = await this.stripe.createAccountLink(account.stripeAccountId, returnUrl);
    return { url: link.url, expiresAt: link.expiresAt.toISOString() };
  }

  async getAccount(providerId: UUID): Promise<StripeAccount | null> {
    const row = await this.findAccountRow(providerId);
    return row ? mapStripeAccountRow(row) : null;
  }

  // ────────────── payment intents ──────────────

  async createIntentForBooking(
    ownerId: UUID,
    bookingId: UUID,
    ownerEmail: string,
  ): Promise<CreatedPaymentIntent> {
    const [booking] = await this.db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.ownerId !== ownerId) throw new ForbiddenException('Not your booking');
    if (booking.status === 'cancelled') {
      throw new ConflictException('Booking is cancelled — cannot pay');
    }

    // Reuse an in-flight intent if one exists (idempotent).
    const [existing] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.bookingId, bookingId))
      .orderBy(desc(payments.createdAt));
    if (
      existing &&
      (existing.status === PaymentStatus.RequiresAction ||
        existing.status === PaymentStatus.Processing ||
        existing.status === PaymentStatus.Succeeded)
    ) {
      // Succeeded paths shouldn't recreate; surface the existing intent.
      const stripePiId = existing.stripePaymentIntentId;
      // Real Stripe needs the client to retrieve the intent for its secret.
      // For the dev path our `pi_dev_*_secret_dev` stays valid.
      return {
        paymentIntentId: stripePiId,
        clientSecret: `${stripePiId}_secret_dev`,
      };
    }

    // Provider must be onboarded enough to receive transfers.
    const acct = await this.findAccountRow(booking.providerId);
    if (!acct?.chargesEnabled) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        message: 'Provider has not finished Stripe onboarding',
        code: 'PROVIDER_NOT_ONBOARDED',
      });
    }

    const applicationFeeCents = Math.round(booking.priceCents * APPLICATION_FEE_PCT);
    const intent = await this.stripe.createPaymentIntent({
      amountCents: booking.priceCents,
      applicationFeeCents,
      currency: 'USD',
      destinationAccountId: acct.stripeAccountId,
      bookingId: booking.id,
      ownerEmail,
    });

    await this.db.insert(payments).values({
      bookingId: booking.id,
      stripePaymentIntentId: intent.id,
      amountCents: booking.priceCents,
      applicationFeeCents,
      currency: 'USD',
      status: PaymentStatus.RequiresAction,
    });

    return { paymentIntentId: intent.id, clientSecret: intent.clientSecret };
  }

  /** Dev-only — owner clicks "Pay" in the dev mock UI. No-op in real mode. */
  async devConfirmIntent(
    ownerId: UUID,
    paymentIntentId: string,
  ): Promise<void> {
    if (!this.stripe.isDevMode()) {
      throw new ConflictException('devConfirmIntent only available in dev mode');
    }
    const [payment] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.stripePaymentIntentId, paymentIntentId));
    if (!payment) throw new NotFoundException('Payment not found');
    const [booking] = await this.db
      .select()
      .from(bookings)
      .where(eq(bookings.id, payment.bookingId));
    if (!booking || booking.ownerId !== ownerId) {
      throw new ForbiddenException('Not your payment');
    }
    await this.stripe.devConfirmPaymentIntent(paymentIntentId);
  }

  // ────────────── webhooks ──────────────

  async handleHttpWebhook(rawBody: Buffer, signature: string | undefined): Promise<void> {
    const evt = this.stripe.parseWebhookEvent(rawBody, signature);
    await this.handleWebhookEvent(evt);
  }

  private async handleWebhookEvent(evt: NormalizedWebhookEvent): Promise<void> {
    if (this.seenEventIds.has(evt.id)) return; // idempotency
    this.seenEventIds.add(evt.id);

    switch (evt.type) {
      case 'account.updated':
        await this.applyAccountUpdate(evt);
        break;
      case 'payment_intent.succeeded':
        await this.applyIntentSucceeded(evt);
        break;
      case 'payment_intent.payment_failed':
        await this.applyIntentFailed(evt);
        break;
      case 'charge.refunded':
        await this.applyChargeRefunded(evt);
        break;
      default:
      // unhandled — drop on the floor
    }
  }

  private async applyAccountUpdate(evt: NormalizedWebhookEvent): Promise<void> {
    if (!evt.data.accountId) return;
    await this.db
      .update(stripeAccounts)
      .set({
        chargesEnabled: evt.data.chargesEnabled ?? false,
        payoutsEnabled: evt.data.payoutsEnabled ?? false,
        detailsSubmitted: evt.data.detailsSubmitted ?? false,
        updatedAt: sql`now()`,
      })
      .where(eq(stripeAccounts.stripeAccountId, evt.data.accountId));
  }

  private async applyIntentSucceeded(evt: NormalizedWebhookEvent): Promise<void> {
    if (!evt.data.paymentIntentId) return;
    const [payment] = await this.db
      .update(payments)
      .set({
        status: PaymentStatus.Succeeded,
        stripeChargeId: evt.data.chargeId ?? null,
        updatedAt: sql`now()`,
      })
      .where(eq(payments.stripePaymentIntentId, evt.data.paymentIntentId))
      .returning();
    if (!payment) return;
    // Auto-flip pending → confirmed once paid. We only allow this for bookings
    // that are still pending; once a provider has confirmed manually we don't
    // overwrite the state.
    await this.db
      .update(bookings)
      .set({ status: 'confirmed', updatedAt: sql`now()` })
      .where(and(eq(bookings.id, payment.bookingId), eq(bookings.status, 'pending')));
  }

  private async applyIntentFailed(evt: NormalizedWebhookEvent): Promise<void> {
    if (!evt.data.paymentIntentId) return;
    await this.db
      .update(payments)
      .set({
        status: PaymentStatus.Failed,
        failureReason: evt.data.failureReason ?? 'unknown',
        updatedAt: sql`now()`,
      })
      .where(eq(payments.stripePaymentIntentId, evt.data.paymentIntentId));
  }

  private async applyChargeRefunded(evt: NormalizedWebhookEvent): Promise<void> {
    if (!evt.data.chargeId) return;
    const totalRefunded = evt.data.refundedCents ?? 0;
    const [row] = await this.db
      .update(payments)
      .set({
        refundedCents: totalRefunded,
        status: PaymentStatus.Refunded,
        updatedAt: sql`now()`,
      })
      .where(eq(payments.stripeChargeId, evt.data.chargeId))
      .returning();
    if (!row) return;
  }

  // ────────────── refunds (called from BookingsService.cancel) ──────────────

  async refundForCancelledBooking(bookingId: UUID, refundCents: number): Promise<void> {
    if (refundCents <= 0) return;
    const [payment] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.bookingId, bookingId));
    if (!payment) return;
    if (payment.status !== PaymentStatus.Succeeded) return;
    if (!payment.stripeChargeId) return;
    if (payment.refundedCents >= refundCents) return; // already refunded

    const remaining = refundCents - payment.refundedCents;
    await this.stripe.refundPayment({
      chargeId: payment.stripeChargeId,
      amountCents: remaining,
    });
  }

  // ────────────── reads ──────────────

  async findForBooking(viewerId: UUID, bookingId: UUID): Promise<Payment | null> {
    const [booking] = await this.db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.ownerId !== viewerId && booking.providerId !== viewerId) {
      throw new ForbiddenException('Not your booking');
    }
    const [payment] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.bookingId, bookingId))
      .orderBy(desc(payments.createdAt));
    return payment ? mapPaymentRow(payment as PaymentRow) : null;
  }

  async earnings(providerId: UUID): Promise<EarningsSummary> {
    // Sum across this provider's succeeded payments.
    const [agg] = await this.db
      .select({
        totalCents: sum(payments.amountCents),
        feeCents: sum(payments.applicationFeeCents),
        refundedCents: sum(payments.refundedCents),
      })
      .from(payments)
      .innerJoin(bookings, eq(bookings.id, payments.bookingId))
      .where(
        and(
          eq(bookings.providerId, providerId),
          eq(payments.status, PaymentStatus.Succeeded),
        ),
      );

    const totalCents = Number(agg?.totalCents ?? 0);
    const feeCents = Number(agg?.feeCents ?? 0);
    const refundedCents = Number(agg?.refundedCents ?? 0);
    const payoutCents = totalCents - feeCents - refundedCents;

    const rows = await this.db
      .select({ payment: payments })
      .from(payments)
      .innerJoin(bookings, eq(bookings.id, payments.bookingId))
      .where(eq(bookings.providerId, providerId))
      .orderBy(desc(payments.createdAt));

    return {
      totalCents,
      payoutCents,
      payments: rows.map((r) => mapPaymentRow(r.payment as PaymentRow)),
    };
  }

  // ────────────── helpers ──────────────

  private async findAccountRow(userId: UUID): Promise<StripeAccountRow | null> {
    const [row] = await this.db
      .select()
      .from(stripeAccounts)
      .where(eq(stripeAccounts.userId, userId));
    return (row as StripeAccountRow | undefined) ?? null;
  }
}
