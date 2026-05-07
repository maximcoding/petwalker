import { z } from 'zod';

/**
 * Two-tier env config.
 *
 *   APP_ENV controls business behaviour.
 *     • dev  — MinIO for S3, cognito-local for Cognito. Zero AWS keys required. Default.
 *     • prod — real AWS Cognito + S3 required. Backend refuses to boot otherwise.
 *
 *   NODE_ENV controls Node optimisations (development | test | production).
 *     If NODE_ENV=production, APP_ENV MUST be 'prod' (guard against ship-by-mistake).
 *
 * Auth and storage code paths are IDENTICAL in dev and prod — they always speak the
 * Cognito and S3 protocols. The only difference is the endpoint URL (set in dev,
 * unset in prod so SDKs use the AWS defaults).
 */

const optionalNonEmpty = z
  .string()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

const optionalUrl = z
  .string()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined))
  .pipe(z.string().url().optional());

const RawEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.enum(['dev', 'prod']).default('dev'),
  API_PORT: z.coerce.number().int().positive().default(3001),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  AWS_REGION: z.string().min(1).default('us-east-1'),

  // --- S3 ---
  AWS_S3_REGION: optionalNonEmpty,
  AWS_S3_BUCKET_PETS: z.string().min(1).default('petwalker-pets-dev'),
  /** Set in dev to point at MinIO; unset in prod (SDK uses AWS). */
  AWS_S3_ENDPOINT: optionalUrl,
  /** Required true for MinIO; auto-true when endpoint is set. */
  AWS_S3_FORCE_PATH_STYLE: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
  AWS_ACCESS_KEY_ID: optionalNonEmpty,
  AWS_SECRET_ACCESS_KEY: optionalNonEmpty,

  // --- Cognito ---
  COGNITO_USER_POOL_ID: z.string().min(1).default('local_petwalker'),
  COGNITO_CLIENT_ID: z.string().min(1).default('petwalker_local_client'),
  COGNITO_CLIENT_SECRET: optionalNonEmpty,
  COGNITO_DOMAIN: optionalUrl,
  /** Set in dev to point at cognito-local; unset in prod (uses AWS). */
  COGNITO_ENDPOINT: optionalUrl,

  // --- Stripe (M4) ---
  STRIPE_SECRET_KEY: optionalNonEmpty,
  STRIPE_WEBHOOK_SECRET: optionalNonEmpty,
  STRIPE_CONNECT_CLIENT_ID: optionalNonEmpty,

  // --- Expo Push (M5) ---
  EXPO_ACCESS_TOKEN: optionalNonEmpty,

  /** Public origin used to compose URLs (CORS, etc.). */
  PUBLIC_API_URL: z.string().url().default('http://localhost:3001'),
});

export type Env = z.infer<typeof RawEnvSchema>;

let cached: Env | undefined;

export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = RawEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment:');
    console.error(parsed.error.format());
    process.exit(1);
  }
  const env = parsed.data;

  // Production safety checks.
  const errs: string[] = [];
  if (env.NODE_ENV === 'production' && env.APP_ENV !== 'prod') {
    errs.push("NODE_ENV=production requires APP_ENV=prod (refusing to boot in dev mode in prod).");
  }
  if (env.APP_ENV === 'prod') {
    if (env.COGNITO_ENDPOINT) {
      errs.push('APP_ENV=prod forbids COGNITO_ENDPOINT (use real AWS Cognito).');
    }
    if (env.AWS_S3_ENDPOINT) {
      errs.push('APP_ENV=prod forbids AWS_S3_ENDPOINT (use real AWS S3, not MinIO).');
    }
    if (env.COGNITO_USER_POOL_ID === 'local_petwalker') {
      errs.push('APP_ENV=prod requires a real COGNITO_USER_POOL_ID.');
    }
    if (env.COGNITO_CLIENT_ID === 'petwalker_local_client') {
      errs.push('APP_ENV=prod requires a real COGNITO_CLIENT_ID.');
    }
  }
  if (errs.length > 0) {
    console.error('Environment validation failed:');
    for (const e of errs) console.error('  • ' + e);
    process.exit(1);
  }

  cached = env;
  return cached;
}

export const ENV_TOKEN = Symbol('ENV');
