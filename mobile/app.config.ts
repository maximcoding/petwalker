import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'petwalker',
  slug: 'petwalker',
  scheme: 'petwalker',
  version: '0.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    bundleIdentifier: 'com.petwalker.app',
    supportsTablet: false,
  },
  android: {
    package: 'com.petwalker.app',
  },
  plugins: ['expo-router'],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001',
    awsRegion: process.env.EXPO_PUBLIC_AWS_REGION,
    cognitoUserPoolId: process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID,
    cognitoClientId: process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID,
    cognitoEndpoint: process.env.EXPO_PUBLIC_COGNITO_ENDPOINT, // dev only
  },
  experiments: {
    typedRoutes: true,
  },
};

export default config;
