import type { User } from '../../types/user.js';
import type { HttpClient } from '../http.js';

/**
 * Auth API — only `me()`. Sign-up, sign-in, confirm, refresh, sign-out, MFA,
 * password reset are handled CLIENT-SIDE against AWS Cognito directly:
 *
 *   web:    @aws-amplify/auth (Amplify v6) or Cognito Hosted UI redirect
 *   mobile: @aws-amplify/auth or amazon-cognito-identity-js
 *
 * Once the client has a valid ID token, it passes it to the API as
 * `Authorization: Bearer <id_token>`. Backend verifies via aws-jwt-verify.
 */
export class AuthApi {
  constructor(private readonly http: HttpClient) {}

  /** Returns the current authenticated user (upserts on first call). */
  me(): Promise<User> {
    return this.http.get('/auth/me');
  }
}
