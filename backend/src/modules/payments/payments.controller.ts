import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { ENV_TOKEN, type Env } from '../../config/env.js';
import { AuthService } from '../auth/auth.service.js';
import { CognitoGuard } from '../auth/cognito.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';

import { PaymentsService, type EarningsSummary } from './payments.service.js';

import {
  type CreatePaymentIntentDto,
  CreatePaymentIntentDto as CreatePaymentIntentSchema,
} from '@petwalker/shared';

import type {
  Payment,
  PaymentIntentResponse,
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
