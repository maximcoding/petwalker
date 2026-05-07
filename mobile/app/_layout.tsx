import { StripeProvider } from '@stripe/stripe-react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type PropsWithChildren } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { configureAmplify } from '@/lib/amplify';
import { queryClient } from '@/lib/query';

const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
// Apple Merchant ID — must match the entry in your Apple Developer account
// AND a certificate uploaded to Stripe Dashboard. Required for Apple Pay; if
// the env var is unset (dev), Apple Pay is silently unavailable but cards
// still work.
const APPLE_MERCHANT_ID = process.env.EXPO_PUBLIC_STRIPE_MERCHANT_ID;

/**
 * In dev mode there's typically no publishable key — the StripeProvider is
 * still safe to mount (it just no-ops PaymentSheet calls). The dev pay path
 * routes around it via `api.payments.devConfirm`. Keeping the provider always
 * mounted means the same code runs in dev and prod.
 */
function StripeWrapper({ children }: PropsWithChildren): JSX.Element {
  if (!PUBLISHABLE_KEY) return <>{children}</>;
  // StripeProvider's `children` type is `ReactElement | ReactElement[]`,
  // narrower than ReactNode. A Fragment counts as a ReactElement.
  return (
    <StripeProvider
      publishableKey={PUBLISHABLE_KEY}
      merchantIdentifier={APPLE_MERCHANT_ID}
      urlScheme="petwalker"
    >
      <>{children}</>
    </StripeProvider>
  );
}

export default function RootLayout(): JSX.Element {
  useEffect(() => {
    configureAmplify();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StripeWrapper>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false }} />
          </StripeWrapper>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
