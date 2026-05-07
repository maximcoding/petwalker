import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { Amplify } from 'aws-amplify';
import Constants from 'expo-constants';

let configured = false;

interface Extra {
  awsRegion?: string;
  cognitoUserPoolId?: string;
  cognitoClientId?: string;
  cognitoEndpoint?: string;
}

export function configureAmplify(): void {
  if (configured) return;

  const extra = (Constants.expoConfig?.extra ?? {}) as Extra;
  const { awsRegion, cognitoUserPoolId, cognitoClientId, cognitoEndpoint } = extra;

  if (!awsRegion || !cognitoUserPoolId || !cognitoClientId) {
    console.warn(
      '[amplify] missing EXPO_PUBLIC_AWS_REGION / COGNITO_USER_POOL_ID / COGNITO_CLIENT_ID — auth will fail',
    );
    return;
  }

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: cognitoUserPoolId,
        userPoolClientId: cognitoClientId,
        // In dev (cognitoEndpoint set), Amplify talks to cognito-local. In prod, real AWS.
        ...(cognitoEndpoint ? { userPoolEndpoint: cognitoEndpoint } : {}),
        loginWith: { email: true },
        signUpVerificationMethod: 'code',
      },
    },
  });

  configured = true;
}
