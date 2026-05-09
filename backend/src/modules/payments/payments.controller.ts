import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { ENV_TOKEN, type Env } from '../../config/env.js';
import { AuthService } from '../auth/auth.service.js';
import { CognitoGuard } from '../auth/cognito.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';

import {
  PaymentsService,
  type BillingHistoryPage,
  type EarningsSummary,
} from './payments.service.js';

import {
  BillingHistoryQuery as BillingHistoryQuerySchema,
  type CreatePaymentIntentDto,
  CreatePaymentIntentDto as CreatePaymentIntentSchema,
  type DevAttachPaymentMethodDto,
  DevAttachPaymentMethodDto as DevAttachPaymentMethodSchema,
} from '@petwalker/shared';

import type {
  Payment,
  PaymentIntentResponse,
  SavedPaymentMethod,
  SetupIntentResponse,
  StripeAccount,
  StripeConnectOnboardResponse,
} from '@petwalker/shared';

@Controller('payments')
export class PaymentsController {
  constructor(
    @Inject(PaymentsService) private readonly payments: PaymentsService,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(ENV_TOKEN) private readonly env: Env,
  ) {}

  // ────────────── Connect onboarding ──────────────

  @Post('connect/onboard')
  @UseGuards(CognitoGuard)
  async onboard(
    @CurrentUser() ctx: { sub: string; email: string },
  ): Promise<StripeConnectOnboardResponse> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    const returnUrl = `${this.env.PUBLIC_API_URL.replace(':3001', ':3030')}/profile?stripe=onboarded`;
    return this.payments.createOnboardLink({ id: me.id, email: me.email }, returnUrl);
  }

  @Get('account')
  @UseGuards(CognitoGuard)
  async account(
    @CurrentUser() ctx: { sub: string; email: string },
  ): Promise<StripeAccount | null> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.payments.getAccount(me.id);
  }

  // ────────────── Pay-for-booking ──────────────

  @Post('intent')
  @UseGuards(CognitoGuard)
  async intent(
    @CurrentUser() ctx: { sub: string; email: string },
    @Body(new ZodValidationPipe(CreatePaymentIntentSchema)) dto: CreatePaymentIntentDto,
  ): Promise<PaymentIntentResponse> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.payments.createIntentForBooking(me.id, dto.bookingId, me.email);
  }

  /**
   * Dev-only — owner clicks the "Pay (mock)" button on the booking page,
   * which fires this endpoint. Real Stripe confirms via Elements client-side.
   */
  @Post('dev/confirm/:paymentIntentId')
  @UseGuards(CognitoGuard)
  @HttpCode(204)
  async devConfirm(
    @CurrentUser() ctx: { sub: string; email: string },
    @Param('paymentIntentId') paymentIntentId: string,
  ): Promise<void> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    await this.payments.devConfirmIntent(me.id, paymentIntentId);
  }

  @Get('booking/:id')
  @UseGuards(CognitoGuard)
  async forBooking(
    @CurrentUser() ctx: { sub: string; email: string },
    @Param('id', new ParseUUIDPipe()) bookingId: string,
  ): Promise<Payment | null> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.payments.findForBooking(me.id, bookingId);
  }

  @Get('earnings')
  @UseGuards(CognitoGuard)
  async earnings(
    @CurrentUser() ctx: { sub: string; email: string },
  ): Promise<EarningsSummary> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.payments.earnings(me.id);
  }

  // ────────────── saved cards (Phase 3) ──────────────

  /** Mints a SetupIntent the client can confirm via Stripe Elements. */
  @Post('payment-methods/setup-intent')
  @UseGuards(CognitoGuard)
  async createSetupIntent(
    @CurrentUser() ctx: { sub: string; email: string },
  ): Promise<SetupIntentResponse> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.payments.createSetupIntent(me.id);
  }

  @Get('payment-methods')
  @UseGuards(CognitoGuard)
  async listMyPaymentMethods(
    @CurrentUser() ctx: { sub: string; email: string },
  ): Promise<SavedPaymentMethod[]> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.payments.listPaymentMethods(me.id);
  }

  @Delete('payment-methods/:id')
  @UseGuards(CognitoGuard)
  @HttpCode(204)
  async removeMyPaymentMethod(
    @CurrentUser() ctx: { sub: string; email: string },
    @Param('id') paymentMethodId: string,
  ): Promise<void> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    await this.payments.removePaymentMethod(me.id, paymentMethodId);
  }

  /** Dev-only fast path; refused when STRIPE_SECRET_KEY is set. */
  @Post('payment-methods/dev')
  @UseGuards(CognitoGuard)
  async devAttachPaymentMethod(
    @CurrentUser() ctx: { sub: string; email: string },
    @Body(new ZodValidationPipe(DevAttachPaymentMethodSchema)) dto: DevAttachPaymentMethodDto,
  ): Promise<SavedPaymentMethod> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.payments.devAddPaymentMethod(me.id, dto);
  }

  /**
   * Owner-side billing history. Cursor-paginated; the cursor is
   * `${createdAt}|${paymentId}` and is opaque on the wire.
   */
  @Get('billing')
  @UseGuards(CognitoGuard)
  async billing(
    @CurrentUser() ctx: { sub: string; email: string },
    @Query(new ZodValidationPipe(BillingHistoryQuerySchema)) q: { cursor?: string; limit: number },
  ): Promise<BillingHistoryPage> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.payments.billingHistory(me.id, q);
  }

  /**
   * Per-booking invoice PDF. Streamed inline with a Content-Disposition
   * filename so the browser shows it inline by default but a "Save as"
   * grabs the right name. Owner OR provider on the booking can fetch.
   */
  @Get('booking/:id/invoice.pdf')
  @UseGuards(CognitoGuard)
  async invoicePdf(
    @CurrentUser() ctx: { sub: string; email: string },
    @Param('id', new ParseUUIDPipe()) bookingId: string,
    @Res({ passthrough: false }) reply: FastifyReply,
  ): Promise<void> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    const pdf = await this.payments.getBookingInvoice(me.id, bookingId);
    reply
      .header('Content-Type', 'application/pdf')
      .header(
        'Content-Disposition',
        `inline; filename="invoice-${bookingId.slice(0, 8)}.pdf"`,
      )
      .header('Content-Length', String(pdf.length))
      .send(pdf);
  }

  // ────────────── webhook (no guard — Stripe-Signature verifies it) ──────────────

  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: FastifyRequest,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: boolean }> {
    // Fastify gives us the parsed JSON; we need the raw bytes for HMAC verify.
    // Workaround: re-stringify (sufficient for webhook signature reproduction
    // in real Stripe — payload is canonical JSON). Production deployments
    // should add a fastify-raw-body plugin instead; the dev path doesn't
    // exercise this code at all.
    const raw = Buffer.from(JSON.stringify(req.body ?? {}), 'utf8');
    await this.payments.handleHttpWebhook(raw, signature);
    return { received: true };
  }
}
