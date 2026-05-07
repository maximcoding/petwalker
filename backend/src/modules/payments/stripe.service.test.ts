import { describe, expect, it } from 'vitest';

import { StripeDevService, type NormalizedWebhookEvent } from './stripe.service.js';

import type { Env } from '../../config/env.js';

const env = {
  AWS_REGION: 'us-east-1',
  COGNITO_USER_POOL_ID: 'local',
  COGNITO_CLIENT_ID: 'local',
  PUBLIC_API_URL: 'http://localhost:3001',
} as unknown as Env;

describe('StripeDevService', () => {
  it('createConnectAccount issues a fake acct_dev_* id', async () => {
    const svc = new StripeDevService(env);
    const acct = await svc.createConnectAccount({ email: 'p@x.test', userId: 'u1' });
    expect(acct.id.startsWith('acct_dev_')).toBe(true);
    expect(acct.chargesEnabled).toBe(false);
  });

  it('createAccountLink instantly onboards the dev account and emits account.updated', async () => {
    const svc = new StripeDevService(env);
    const acct = await svc.createConnectAccount({ email: 'p@x.test', userId: 'u1' });

    const events: NormalizedWebhookEvent[] = [];
    svc.onDevWebhook((evt) => events.push(evt));

    await svc.createAccountLink(acct.id, 'http://localhost/return');

    // Webhook fires after a short setTimeout — wait it out.
    await new Promise((r) => setTimeout(r, 250));
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('account.updated');
    expect(events[0]?.data.chargesEnabled).toBe(true);

    const reread = await svc.getAccount(acct.id);
    expect(reread.chargesEnabled).toBe(true);
  });

  it('devConfirmPaymentIntent emits payment_intent.succeeded with charge id', async () => {
    const svc = new StripeDevService(env);
    const acct = await svc.createConnectAccount({ email: 'p@x.test', userId: 'u1' });
    await svc.createAccountLink(acct.id, 'http://localhost/return');

    const intent = await svc.createPaymentIntent({
      amountCents: 5000,
      applicationFeeCents: 750,
      currency: 'USD',
      destinationAccountId: acct.id,
      bookingId: 'b1',
      ownerEmail: 'o@x.test',
    });

    const events: NormalizedWebhookEvent[] = [];
    svc.onDevWebhook((evt) => {
      if (evt.type === 'payment_intent.succeeded') events.push(evt);
    });

    await svc.devConfirmPaymentIntent(intent.id);
    await new Promise((r) => setTimeout(r, 1100));

    expect(events).toHaveLength(1);
    expect(events[0]?.data.paymentIntentId).toBe(intent.id);
    expect(events[0]?.data.chargeId?.startsWith('ch_dev_')).toBe(true);
    expect(events[0]?.data.amountReceived).toBe(5000);
  });

  it('devConfirmPaymentIntent is idempotent — second call is a no-op', async () => {
    const svc = new StripeDevService(env);
    const acct = await svc.createConnectAccount({ email: 'p@x.test', userId: 'u1' });
    await svc.createAccountLink(acct.id, 'http://localhost/return');

    const intent = await svc.createPaymentIntent({
      amountCents: 5000,
      applicationFeeCents: 750,
      currency: 'USD',
      destinationAccountId: acct.id,
      bookingId: 'b1',
      ownerEmail: 'o@x.test',
    });

    const events: NormalizedWebhookEvent[] = [];
    svc.onDevWebhook((evt) => {
      if (evt.type === 'payment_intent.succeeded') events.push(evt);
    });

    await svc.devConfirmPaymentIntent(intent.id);
    await svc.devConfirmPaymentIntent(intent.id);
    await new Promise((r) => setTimeout(r, 1100));

    expect(events).toHaveLength(1); // only one webhook for the first transition
  });

  it('refundPayment fires charge.refunded with cumulative total', async () => {
    const svc = new StripeDevService(env);
    const acct = await svc.createConnectAccount({ email: 'p@x.test', userId: 'u1' });
    await svc.createAccountLink(acct.id, 'http://localhost/return');

    const intent = await svc.createPaymentIntent({
      amountCents: 5000,
      applicationFeeCents: 750,
      currency: 'USD',
      destinationAccountId: acct.id,
      bookingId: 'b1',
      ownerEmail: 'o@x.test',
    });
    await svc.devConfirmPaymentIntent(intent.id);
    await new Promise((r) => setTimeout(r, 1000));

    const events: NormalizedWebhookEvent[] = [];
    svc.onDevWebhook((evt) => {
      if (evt.type === 'charge.refunded') events.push(evt);
    });

    // Find the chargeId from the dev impl.
    // We don't expose it directly — refund by chargeId pattern instead.
    // The intent has chargeId set on confirm; we'd normally read it from the
    // payments table. For this test we let refundPayment fail-soft: pass any
    // id and assert the emission shape.
    const realChargeId = await getInternalChargeId(svc, intent.id);
    await svc.refundPayment({ chargeId: realChargeId, amountCents: 1500 });
    await new Promise((r) => setTimeout(r, 200));

    expect(events).toHaveLength(1);
    expect(events[0]?.data.refundedCents).toBe(1500);
    expect(events[0]?.data.paymentIntentId).toBe(intent.id);

    await svc.refundPayment({ chargeId: realChargeId, amountCents: 1000 });
    await new Promise((r) => setTimeout(r, 200));
    // Total refunded is cumulative.
    expect(events.at(-1)?.data.refundedCents).toBe(2500);
  });
});

/**
 * Helper: dig the dev intent's chargeId out of the service. Avoids exposing a
 * private accessor on the production impl.
 */
async function getInternalChargeId(
  svc: StripeDevService,
  intentId: string,
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const intents: Map<string, { chargeId: string | null }> = (svc as any).intents;
  const i = intents.get(intentId);
  if (!i?.chargeId) throw new Error('chargeId not set yet');
  return i.chargeId;
}
