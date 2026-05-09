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
  users,
  type PaymentRow,
  type StripeAccountRow,
} from '../../db/schema/index.js';

import { buildInvoicePdf } from './invoice-pdf.js';
import { mapPaymentRow, mapStripeAccountRow } from './payment.mapper.js';
import {
  STRIPE_SERVICE,
  type NormalizedWebhookEvent,
  type StripeService,
} from './stripe.service.js';

import { PaymentStatus } from '@petwalker/shared/enums';

import type {
  BillingHistoryEntry,
  BillingHistoryQuery,
  DevAttachPaymentMethodDto,
  Payment,
  SavedPaymentMethod,
  SetupIntentResponse,
  StripeAccount,
  UUID,
} from '@petwalker/shared';

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

export interface BillingHistoryPage {
  items: BillingHistoryEntry[];
  /** Opaque cursor — feed to next call as `cursor`. Null when at end. */
  nextCursor: string | null;
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

  // ─────── saved cards (Phase 3) ───────────────────────────────────────

  /**
   * Look up the user's Stripe Customer id, minting one (and persisting
   * it on the user row) the first time. Same idempotency guarantee as
   * the underlying StripeService.ensureCustomer.
   */
  private async ensureCustomerForUser(userId: UUID): Promise<string> {
    const [row] = await this.db
      .select({
        id: users.id,
        email: users.email,
        stripeCustomerId: users.stripeCustomerId,
      })
      .from(users)
      .where(eq(users.id, userId));
    if (!row) throw new NotFoundException('User not found');
    if (row.stripeCustomerId) return row.stripeCustomerId;

    const { customerId } = await this.stripe.ensureCustomer({
      userId: row.id,
      email: row.email,
    });
    await this.db
      .update(users)
      .set({ stripeCustomerId: customerId, updatedAt: sql`now()` })
      .where(eq(users.id, userId));
    return customerId;
  }

  async createSetupIntent(userId: UUID): Promise<SetupIntentResponse> {
    const customerId = await this.ensureCustomerForUser(userId);
    const si = await this.stripe.createSetupIntent({ customerId });
    return {
      setupIntentId: si.id,
      clientSecret: si.clientSecret,
      dev: this.stripe.isDevMode(),
    };
  }

  async listPaymentMethods(userId: UUID): Promise<SavedPaymentMethod[]> {
    // Don't auto-mint a customer for a read — if the user has never
    // started the add-card flow they have nothing saved, return [].
    const [row] = await this.db
      .select({ stripeCustomerId: users.stripeCustomerId })
      .from(users)
      .where(eq(users.id, userId));
    if (!row?.stripeCustomerId) return [];
    const list = await this.stripe.listPaymentMethods(row.stripeCustomerId);
    return list.map((pm) => ({ ...pm, dev: this.stripe.isDevMode() }));
  }

  async removePaymentMethod(userId: UUID, paymentMethodId: string): Promise<void> {
    const [row] = await this.db
      .select({ stripeCustomerId: users.stripeCustomerId })
      .from(users)
      .where(eq(users.id, userId));
    if (!row?.stripeCustomerId) {
      throw new NotFoundException('No saved cards on this account');
    }
    await this.stripe.detachPaymentMethod({
      customerId: row.stripeCustomerId,
      paymentMethodId,
    });
  }

  async devAddPaymentMethod(
    userId: UUID,
    dto: DevAttachPaymentMethodDto,
  ): Promise<SavedPaymentMethod> {
    if (!this.stripe.isDevMode()) {
      throw new ForbiddenException(
        'Dev card-attach is only available when STRIPE_SECRET_KEY is unset',
      );
    }
    const customerId = await this.ensureCustomerForUser(userId);
    const pm = await this.stripe.devAttachPaymentMethod({
      customerId,
      brand: dto.brand,
      last4: dto.last4,
      expMonth: dto.expMonth,
      expYear: dto.expYear,
      makeDefault: dto.makeDefault ?? false,
    });
    return { ...pm, dev: true };
  }

  // ─────── billing history (Phase 3) ──────────────────────────────────

  /**
   * Owner-side view of past payments. Joins payments → bookings to pull
   * the service type and the provider as the "counterparty". Cursor
   * pagination uses `(createdAt DESC, id DESC)` for stable ordering even
   * when multiple rows share a timestamp.
   *
   * The cursor is `${createdAt.toISOString()}|${id}` opaquely — callers
   * treat it as a string. Decoding here lives in `parseBillingCursor` so
   * any future change to the ordering tuple is one-line.
   */
  async billingHistory(userId: UUID, q: BillingHistoryQuery): Promise<BillingHistoryPage> {
    const limit = q.limit;
    const cursor = q.cursor ? parseBillingCursor(q.cursor) : null;

    // Drizzle's typed query builder doesn't give us a clean way to do
    // "WHERE (created_at, id) < ($cursorAt, $cursorId)" without leaving
    // the ORM, so we lower to raw SQL for the cursor predicate. Bound
    // params via sql.placeholder/raw to stay injection-safe.
    const cursorPredicate = cursor
      ? sql`AND (p.created_at, p.id) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`
      : sql``;

    type Row = {
      paymentId: string;
      bookingId: string;
      occurredAt: Date;
      amountCents: number;
      refundedCents: number;
      currency: string;
      status: string;
      serviceType: string;
      counterpartyName: string | null;
    };

    const rows = (await this.db.execute(sql`
      SELECT
        p.id            AS "paymentId",
        p.booking_id    AS "bookingId",
        p.created_at    AS "occurredAt",
        p.amount_cents  AS "amountCents",
        p.refunded_cents AS "refundedCents",
        p.currency      AS "currency",
        p.status        AS "status",
        b.service_type  AS "serviceType",
        u.full_name     AS "counterpartyName"
      FROM payments p
      JOIN bookings b ON b.id = p.booking_id
      JOIN users u    ON u.id = b.provider_id
      WHERE b.owner_id = ${userId}::uuid
      ${cursorPredicate}
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT ${limit + 1}
    `)) as unknown as Row[];

    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor =
      hasMore && slice.length > 0
        ? makeBillingCursor(slice[slice.length - 1]!.occurredAt, slice[slice.length - 1]!.paymentId)
        : null;

    const items: BillingHistoryEntry[] = slice.map((r) => ({
      paymentId: r.paymentId,
      bookingId: r.bookingId,
      occurredAt: r.occurredAt.toISOString(),
      amountCents: r.amountCents,
      refundedCents: r.refundedCents,
      netCents: r.amountCents - r.refundedCents,
      currency: r.currency,
      status: r.status as BillingHistoryEntry['status'],
      serviceType: r.serviceType,
      counterpartyName: r.counterpartyName,
    }));

    return { items, nextCursor };
  }
}

function makeBillingCursor(createdAt: Date, id: string): string {
  return `${createdAt.toISOString()}|${id}`;
}

/**
 * Bound on the prototype so the controller can stay thin. Lives outside
 * the class as a free helper because tsc treats class augmentations as
 * second-class — and the inline body would dwarf the controller.
 */
declare module './payments.service.js' {
  interface PaymentsService {
    getBookingInvoice(viewerId: UUID, bookingId: UUID): Promise<Buffer>;
  }
}

PaymentsService.prototype.getBookingInvoice = async function getBookingInvoice(
  this: PaymentsService,
  viewerId: UUID,
  bookingId: UUID,
): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (this as unknown as { db: Database }).db;
  type Row = {
    bookingId: string;
    ownerId: string;
    providerId: string;
    serviceType: string;
    durationMin: number;
    priceCents: number;
    refundCents: number;
    appFeeCents: number;
    providerFeeCents: number;
    scheduledAt: Date;
    createdAt: Date;
    ownerName: string | null;
    ownerEmail: string;
    providerName: string | null;
    providerEmail: string;
  };
  const rows = (await db.execute(sql`
    SELECT
      b.id              AS "bookingId",
      b.owner_id        AS "ownerId",
      b.provider_id     AS "providerId",
      b.service_type    AS "serviceType",
      b.duration_min    AS "durationMin",
      b.price_cents     AS "priceCents",
      b.refund_cents    AS "refundCents",
      b.app_fee_cents   AS "appFeeCents",
      b.provider_fee_cents AS "providerFeeCents",
      b.scheduled_at    AS "scheduledAt",
      b.created_at      AS "createdAt",
      ou.full_name      AS "ownerName",
      ou.email          AS "ownerEmail",
      pu.full_name      AS "providerName",
      pu.email          AS "providerEmail"
    FROM bookings b
    JOIN users ou ON ou.id = b.owner_id
    JOIN users pu ON pu.id = b.provider_id
    WHERE b.id = ${bookingId}::uuid
    LIMIT 1
  `)) as unknown as Row[];

  const row = rows[0];
  if (!row) throw new NotFoundException('Booking not found');
  if (row.ownerId !== viewerId && row.providerId !== viewerId) {
    throw new ForbiddenException('Not your booking');
  }

  const fmtMoney = (cents: number): string => `$${(cents / 100).toFixed(2)}`;
  const lines = [
    {
      label: `${row.serviceType.replace('_', ' ')} — ${row.durationMin} min`,
      amount: fmtMoney(row.priceCents),
    },
  ];
  const refundLabel = row.refundCents > 0 ? 'Refund' : undefined;
  const refundAmount = row.refundCents > 0 ? `−${fmtMoney(row.refundCents)}` : undefined;
  const totalCents = row.priceCents - row.refundCents;

  return buildInvoicePdf({
    invoiceNumber: row.bookingId.slice(0, 8).toUpperCase(),
    issuedAt: row.createdAt.toISOString().slice(0, 10),
    ownerName: row.ownerName ?? row.ownerEmail,
    ownerEmail: row.ownerEmail,
    providerName: row.providerName ?? row.providerEmail,
    providerEmail: row.providerEmail,
    lines,
    refundLabel,
    refundAmount,
    totalLabel: 'Total',
    totalAmount: fmtMoney(totalCents),
    footerNote: 'Thank you for using petwalker.',
  });
};

function parseBillingCursor(raw: string): { createdAt: string; id: string } | null {
  const idx = raw.lastIndexOf('|');
  if (idx === -1) return null;
  const createdAt = raw.slice(0, idx);
  const id = raw.slice(idx + 1);
  if (!createdAt || !id) return null;
  return { createdAt, id };
}
