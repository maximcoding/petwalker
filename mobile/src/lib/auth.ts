import {
  confirmSignUp as amplifyConfirm,
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  signUp as amplifySignUp,
  fetchAuthSession,
  getCurrentUser,
} from 'aws-amplify/auth';

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
  // cognito-local doesn't support SRP; use plain password flow. Real AWS supports
  // both, so the same flow works in prod too.
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
