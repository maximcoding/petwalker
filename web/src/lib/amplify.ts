'use client';

import { Amplify } from 'aws-amplify';

let configured = false;

// Self-call on module load so Amplify is ready before any auth-dependent
// code runs (the useEffect in <Providers/> ran AFTER child useEffects in some
// page mounts, which made getCurrentUser() return null on hard navigation).
if (typeof window !== 'undefined') {
  queueMicrotask(() => configureAmplify());
}

export function configureAmplify(): void {
  if (configured) return;

  const region = process.env.NEXT_PUBLIC_AWS_REGION;
  const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
  const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
  const userPoolEndpoint = process.env.NEXT_PUBLIC_COGNITO_ENDPOINT; // dev only — points at cognito-local

  if (!region || !userPoolId || !userPoolClientId) {
    console.warn(
      '[amplify] missing NEXT_PUBLIC_AWS_REGION / NEXT_PUBLIC_COGNITO_USER_POOL_ID / NEXT_PUBLIC_COGNITO_CLIENT_ID — auth will fail',
    );
    return;
  }

  Amplify.configure(
    {
      Auth: {
        Cognito: {
          userPoolId,
          userPoolClientId,
          // In dev, point Amplify at cognito-local. In prod, leave undefined — Amplify uses real AWS.
          ...(userPoolEndpoint ? { userPoolEndpoint } : {}),
          loginWith: { email: true },
          signUpVerificationMethod: 'code',
        },
      },
    },
    { ssr: true },
  );

  configured = true;
}
