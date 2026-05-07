import { createPublicKey, verify as cryptoVerify } from 'node:crypto';

import { JwtRsaVerifier } from 'aws-jwt-verify';

import type { Env } from '../../config/env.js';

export interface CognitoClaims {
  sub: string;
  email: string;
  email_verified?: boolean;
  'cognito:username'?: string;
  exp: number;
  iat: number;
  iss: string;
  aud: string;
  token_use: 'id' | 'access';
}

interface DevKey {
  kid: string;
  publicKey: ReturnType<typeof createPublicKey>;
}

/**
 * Standalone JWT verifier shared by the HTTP CognitoGuard and the WebSocket
 * gateways. Two paths:
 *   • dev (COGNITO_ENDPOINT set) — fetch JWKS over plain http (aws-jwt-verify
 *     refuses non-https), verify RS256 with `node:crypto`, accept any of
 *     0.0.0.0 / localhost / 127.0.0.1 as the issuer host since cognito-local
 *     emits 0.0.0.0 regardless of how the client reached it.
 *   • prod — standard aws-jwt-verify against AWS Cognito's JWKS.
 *
 * Construct once, call .verify(token) per request / per WS handshake.
 */
export class CognitoJwtVerifier {
  private prodVerifier: ReturnType<typeof JwtRsaVerifier.create> | null = null;
  private devKeys: DevKey[] = [];
  private ready: Promise<void>;

  constructor(private readonly env: Env) {
    this.ready = env.COGNITO_ENDPOINT ? this.initDev() : Promise.resolve(this.initProd());
  }

  /** Resolves once JWKS / verifiers are usable. Always await before .verify(). */
  whenReady(): Promise<void> {
    return this.ready;
  }

  async verify(token: string): Promise<CognitoClaims> {
    await this.ready;
    if (this.env.COGNITO_ENDPOINT) return this.verifyDev(token);
    return this.verifyProd(token);
  }

  // ────────────── dev path ──────────────

  private async initDev(): Promise<void> {
    const base = this.env.COGNITO_ENDPOINT!.replace(/\/$/, '');
    const jwksUrl = `${base}/${this.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`;
    const res = await fetch(jwksUrl);
    if (!res.ok) throw new Error(`JWKS fetch ${res.status} from ${jwksUrl}`);
    const jwks = (await res.json()) as { keys: Array<Record<string, unknown> & { kid?: string }> };
    if (!jwks.keys?.length) throw new Error(`empty JWKS at ${jwksUrl}`);

    this.devKeys = jwks.keys.map((jwk) => ({
      kid: String(jwk.kid ?? ''),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      publicKey: createPublicKey({ key: jwk as any, format: 'jwk' }),
    }));
  }

  private verifyDev(token: string): CognitoClaims {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('malformed JWT');
    const [headerB64, payloadB64, sigB64] = parts;
    if (!headerB64 || !payloadB64 || !sigB64) {
      // Required for noUncheckedIndexedAccess; the length check above already
      // guarantees this, but TS doesn't see through it.
      throw new Error('malformed JWT');
    }
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8')) as {
      alg: string;
      kid?: string;
    };
    if (header.alg !== 'RS256') throw new Error(`unsupported alg ${header.alg}`);

    const key = this.devKeys.find((k) => !header.kid || k.kid === header.kid);
    if (!key) throw new Error(`no key for kid ${header.kid}`);

    const ok = cryptoVerify(
      'RSA-SHA256',
      Buffer.from(`${headerB64}.${payloadB64}`),
      key.publicKey,
      Buffer.from(sigB64, 'base64url'),
    );
    if (!ok) throw new Error('signature verification failed');

    const claims = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8'),
    ) as CognitoClaims;

    const now = Math.floor(Date.now() / 1000);
    if (claims.exp <= now) throw new Error('token expired');
    if (claims.aud !== this.env.COGNITO_CLIENT_ID) {
      throw new Error(`audience mismatch: ${claims.aud}`);
    }

    const expectedIssuerSuffix = `:9229/${this.env.COGNITO_USER_POOL_ID}`;
    const okIss = ACCEPTED_DEV_ISSUER_HOSTS.some(
      (h) => claims.iss === `http://${h}${expectedIssuerSuffix}`,
    );
    if (!okIss) throw new Error(`issuer not allowed: ${claims.iss}`);

    return claims;
  }

  // ────────────── prod path ──────────────

  private initProd(): void {
    const issuer = `https://cognito-idp.${this.env.AWS_REGION}.amazonaws.com/${this.env.COGNITO_USER_POOL_ID}`;
    this.prodVerifier = JwtRsaVerifier.create({
      issuer,
      audience: this.env.COGNITO_CLIENT_ID,
      jwksUri: `${issuer}/.well-known/jwks.json`,
    });
  }

  private async verifyProd(token: string): Promise<CognitoClaims> {
    if (!this.prodVerifier) throw new Error('prod verifier not initialised');
    return (await this.prodVerifier.verify(token)) as unknown as CognitoClaims;
  }
}

const ACCEPTED_DEV_ISSUER_HOSTS = ['0.0.0.0', 'localhost', '127.0.0.1'];

/**
 * Singleton accessor — Nest providers can inject this once via factory and
 * gateways can grab it without going through DI (handy in handleConnection
 * where there's no Nest request context yet).
 */
let singleton: CognitoJwtVerifier | null = null;

export function initCognitoJwtVerifier(env: Env): CognitoJwtVerifier {
  if (!singleton) singleton = new CognitoJwtVerifier(env);
  return singleton;
}

export function getCognitoJwtVerifier(): CognitoJwtVerifier {
  if (!singleton) {
    throw new Error('Cognito JWT verifier not initialised — call initCognitoJwtVerifier in module init');
  }
  return singleton;
}
