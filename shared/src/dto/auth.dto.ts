// petwalker auth — Cognito does ALL of: sign-up, confirm, sign-in,
// MFA, refresh, password reset, sign-out. Backend never sees passwords.
//
// Clients (web via Amplify Auth, mobile via amazon-cognito-identity-js or
// Amplify) hit Cognito directly and obtain ID + access tokens. The token is
// then sent to our API as `Authorization: Bearer <id_token>`, where the
// `CognitoGuard` verifies it and populates the request context.
//
// Therefore there are NO sign-up / sign-in DTOs here — those would imply
// backend endpoints we don't have and won't build.

export {};
