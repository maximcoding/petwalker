'use client';

import {
  confirmSignUp as amplifyConfirm,
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  signUp as amplifySignUp,
  fetchAuthSession,
  getCurrentUser,
} from 'aws-amplify/auth';

import { configureAmplify } from './amplify';

// Ensure Amplify is configured before the first auth call. configureAmplify is
// idempotent — safe to call from multiple entry points.
configureAmplify();

/**
 * Thin wrappers around Amplify Auth — keep all Cognito calls here
 * so pages stay UI-only. Backend is never involved in these flows.
 */

export async function signUp(params: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}): Promise<{ userSub: string; nextStep: string }> {
  const out = await amplifySignUp({
    username: params.email,
    password: params.password,
    options: {
      userAttributes: {
        email: params.email,
        name: params.fullName,
        ...(params.phone ? { phone_number: params.phone } : {}),
      },
    },
  });
  return { userSub: out.userId ?? '', nextStep: out.nextStep.signUpStep };
}

export async function confirmSignUp(email: string, code: string): Promise<void> {
  await amplifyConfirm({ username: email, confirmationCode: code });
}

export async function signIn(email: string, password: string): Promise<void> {
  // Amplify v6 refuses to start a new sign-in while a session is still
  // cached in localStorage — even if the cached user is stale (e.g. the
  // cognito-local seed was renamed). Drop the residual session first so
  // the new credentials always go through cleanly.
  try {
    const current = await getCurrentUser();
    if (current) {
      await amplifySignOut({ global: false });
    }
  } catch {
    // No current user — nothing to clear, proceed straight to sign-in.
  }
  // cognito-local only supports USER_PASSWORD_AUTH; real AWS supports both
  // and there's no harm using the same flow in prod, so we hardcode it.
  await amplifySignIn({
    username: email,
    password,
    options: { authFlowType: 'USER_PASSWORD_AUTH' },
  });
}

export async function signOut(): Promise<void> {
  await amplifySignOut({ global: false });
}

export async function getIdToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() ?? null;
  } catch {
    return null;
  }
}

export async function getMe(): Promise<{ userId: string; username: string } | null> {
  try {
    const u = await getCurrentUser();
    return { userId: u.userId, username: u.username };
  } catch {
    return null;
  }
}
