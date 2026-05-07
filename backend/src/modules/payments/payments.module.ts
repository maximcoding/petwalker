import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { stripeServiceProvider } from './stripe.service.js';

/**
 * `stripeServiceProvider` is a factory provider — Nest invokes it with
 * `ENV_TOKEN` and gets back either StripeRealService or StripeDevService.
 * The classes themselves don't need to be registered as providers because
 * the factory `new`s them directly.
 */
@Module({
  imports: [AuthModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, stripeServiceProvider],
  exports: [PaymentsService, stripeServiceProvider],
})
export class PaymentsModule {}
