export const PaymentStatus = {
  RequiresAction: 'requires_action',
  Processing: 'processing',
  Succeeded: 'succeeded',
  Failed: 'failed',
  Refunded: 'refunded',
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PAYMENT_STATUSES = [
  'requires_action',
  'processing',
  'succeeded',
  'failed',
  'refunded',
] as const satisfies readonly PaymentStatus[];
